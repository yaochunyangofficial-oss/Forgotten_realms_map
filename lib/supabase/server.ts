import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AtlasApiError } from '@/lib/api-errors';

function projectUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || /your_project/i.test(url)) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('invalid protocol');
  } catch {
    throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  }
  return url;
}

function publicKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key || /your_/i.test(key)) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  return key;
}

export async function authClient() {
  const url = projectUrl();
  const key = publicKey();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        for (const { name, value, options } of values) {
          try {
            jar.set(name, value, options);
          } catch {
            // Read-only Server Component renders cannot write cookies. Route
            // handlers and Server Actions can; callers still read the session.
          }
        }
      },
    },
  });
}

/** Server-only elevated client. Never import this module from client code. */
export function database() {
  const url = projectUrl();
  const key = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || /your_/i.test(key)) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
