import { NextResponse } from 'next/server';
import { authClient } from '@/lib/supabase/server';
import { classifySupabaseError } from '@/lib/api-errors';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=AUTH_FAILURE', url.origin));

  try {
    const client = await authClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL('/', url.origin));
  } catch (error) {
    const code = classifySupabaseError(error, 'auth').code;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, url.origin));
  }
}
