import { authClient, database } from '@/lib/supabase/server';
import { initialData } from '@/lib/geography';
import { validData } from '@/lib/validate';
import { apiErrorText, AtlasApiError, classifySupabaseError, type ApiErrorCode } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

function answer(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function identity() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw classifySupabaseError(error, 'auth');
  if (!data.user) throw new AtlasApiError('AUTH_REQUIRED', 401);
  return data.user;
}

function fail(error: unknown, operation: string, fallback: ApiErrorCode) {
  const classified = error instanceof AtlasApiError
    ? error
    : classifySupabaseError(error, 'database');
  const code = classified.code === 'INTERNAL_ERROR' ? fallback : classified.code;
  const status = classified.code === 'INTERNAL_ERROR' ? 500 : classified.status;
  const original = error as { code?: string; name?: string; message?: string } | null;
  // Log only provider diagnostics. Never log request bodies, campaign data,
  // notes, cookies, access tokens, or environment values.
  console.error('[api/atlas]', {
    operation,
    code,
    providerCode: original?.code,
    errorName: original?.name,
    detail: original?.message?.slice(0, 240),
  });
  return answer({ code, error: apiErrorText[code], ...(code === 'AUTH_REQUIRED' || code === 'AUTH_FAILURE' ? { signedOut: true } : {}) }, status);
}

async function campaignAccess(db: ReturnType<typeof database>, id: string, userId: string) {
  const { data: campaign, error } = await db
    .from('campaigns')
    .select('id,owner,invite,data,revision')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!campaign) throw new AtlasApiError('CAMPAIGN_NOT_FOUND', 404);
  if (campaign.owner === userId) return { campaign, role: 'gm' as const };

  const { data: membership, error: membershipError } = await db
    .from('memberships')
    .select('user_id')
    .eq('campaign', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new AtlasApiError('PERMISSION_DENIED', 403);
  return { campaign, role: 'player' as const };
}

export async function GET(req: Request) {
  try {
    const user = await identity();
    const db = database();
    const id = new URL(req.url).searchParams.get('id');

    if (!id) {
      const [own, joined] = await Promise.all([
        db.from('campaigns').select('id').eq('owner', user.id),
        db.from('memberships').select('campaign').eq('user_id', user.id),
      ]);
      if (own.error) throw own.error;
      if (joined.error) throw joined.error;
      const campaigns = [
        ...own.data.map((campaign: { id: string }) => ({ id: campaign.id, role: 'gm' })),
        ...joined.data
          .filter((membership: { campaign: string }) => !own.data.some((campaign: { id: string }) => campaign.id === membership.campaign))
          .map((membership: { campaign: string }) => ({ id: membership.campaign, role: 'player' })),
      ];
      return answer({ campaigns });
    }

    const { campaign, role } = await campaignAccess(db, id, user.id);
    const { data: rows, error } = await db
      .from('notes')
      .select('location,body')
      .eq('campaign', id)
      .eq('user_id', user.id);
    if (error) throw error;

    const data = role === 'gm'
      ? campaign.data
      : { ...campaign.data, places: campaign.data.places
        .filter((place: { hidden?: boolean }) => !place.hidden)
        .map(({ gmNotes: _gmNotes, ...place }: { gmNotes?: string; [key: string]: unknown }) => place) };

    return answer({
      id,
      role,
      revision: campaign.revision,
      data,
      notes: Object.fromEntries(rows.map((note: { location: string; body: string }) => [note.location, note.body])),
      ...(role === 'gm' ? { invite: campaign.invite } : {}),
    });
  } catch (error) {
    if (error instanceof AtlasApiError) return fail(error, 'load', 'LOAD_FAILED');
    if ((error as { status?: number } | null)?.status === 401) return fail(error, 'load', 'LOAD_FAILED');
    return fail(error, 'load', 'LOAD_FAILED');
  }
}

export async function POST(req: Request) {
  let action = 'unknown';
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) throw new AtlasApiError('ORIGIN_MISMATCH', 403);
    const user = await identity();
    const text = await req.text();
    if (text.length > 1_500_000) throw new AtlasApiError('INVALID_REQUEST', 413);
    let body: Record<string, any>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AtlasApiError('INVALID_REQUEST', 400);
    }
    action = typeof body.action === 'string' ? body.action : 'unknown';
    const db = database();

    if (action === 'create' || action === 'import') {
      let data = initialData;
      let notes: Record<string, string> = {};
      if (action === 'import') {
        const backup = body.backup;
        if (backup?.format !== 'dnd-map-backup' || backup.version !== 1 || !validData(backup.data)
          || !backup.notes || typeof backup.notes !== 'object' || Array.isArray(backup.notes)
          || Object.entries(backup.notes).some(([id, value]) => !backup.data.places.some((place: { id: string }) => place.id === id)
            || typeof value !== 'string' || value.length > 20_000)) {
          throw new AtlasApiError('INVALID_REQUEST', 400);
        }
        data = backup.data;
        notes = backup.notes;
      }

      const { data: campaign, error } = await db
        .from('campaigns')
        .insert({ owner: user.id, data })
        .select('id,invite,revision,data')
        .single();
      if (error) throw error;
      if (!campaign) throw new AtlasApiError('CREATE_FAILED', 500);

      if (Object.keys(notes).length) {
        const { error: notesError } = await db.from('notes').insert(
          Object.entries(notes).map(([location, body]) => ({ campaign: campaign.id, user_id: user.id, location, body })),
        );
        if (notesError) {
          await db.from('campaigns').delete().eq('id', campaign.id).eq('owner', user.id);
          throw notesError;
        }
      }

      // Return the created session data with the insert. The UI can enter the
      // new campaign immediately without relying on a second read request.
      return answer({ id: campaign.id, role: 'gm', revision: campaign.revision, data: campaign.data, notes, invite: campaign.invite });
    }

    if (action === 'join') {
      if (typeof body.invite !== 'string' || !body.invite.trim()) throw new AtlasApiError('INVITE_INVALID', 404);
      const { data: campaign, error } = await db
        .from('campaigns')
        .select('id')
        .eq('invite', body.invite.trim())
        .maybeSingle();
      if (error) throw error;
      if (!campaign) throw new AtlasApiError('INVITE_INVALID', 404);
      const { error: joinError } = await db.from('memberships').upsert(
        { campaign: campaign.id, user_id: user.id },
        { onConflict: 'campaign,user_id', ignoreDuplicates: true },
      );
      if (joinError) throw joinError;
      return answer({ id: campaign.id });
    }

    if (typeof body.id !== 'string' || !body.id) throw new AtlasApiError('INVALID_REQUEST', 400);
    const { campaign, role } = await campaignAccess(db, body.id, user.id);

    if (action === 'note') {
      const allowedPlace = campaign.data.places.some((place: { id: string; hidden?: boolean }) =>
        place.id === body.location && (role === 'gm' || !place.hidden));
      if (typeof body.body !== 'string' || body.body.length > 20_000 || !allowedPlace) {
        throw new AtlasApiError('INVALID_REQUEST', 400);
      }
      const { error } = await db.from('notes').upsert(
        { campaign: body.id, user_id: user.id, location: body.location, body: body.body },
        { onConflict: 'campaign,user_id,location' },
      );
      if (error) throw error;
      return answer({ ok: true });
    }

    if (role !== 'gm') throw new AtlasApiError('PERMISSION_DENIED', 403);
    if (action === 'save') {
      if (!validData(body.data) || !Number.isInteger(body.revision)) throw new AtlasApiError('INVALID_REQUEST', 400);
      const { data: rows, error } = await db
        .from('campaigns')
        .update({ data: body.data, revision: body.revision + 1 })
        .eq('id', body.id)
        .eq('owner', user.id)
        .eq('revision', body.revision)
        .select('revision');
      if (error) throw error;
      if (!rows.length) throw new AtlasApiError('SAVE_CONFLICT', 409);
      return answer({ revision: rows[0].revision });
    }
    throw new AtlasApiError('INVALID_REQUEST', 400);
  } catch (error) {
    const fallback: ApiErrorCode = action === 'create' || action === 'import'
      ? 'CREATE_FAILED'
      : action === 'save' || action === 'note' ? 'SAVE_FAILED' : 'INTERNAL_ERROR';
    return fail(error, action, fallback);
  }
}
