'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authClient } from '@/lib/supabase/server';
import { AtlasApiError, classifySupabaseError } from '@/lib/api-errors';

function localeFrom(form: FormData) {
  return form.get('locale') === 'en' ? 'en' : 'zh';
}

function loginError(error: unknown) {
  return error instanceof AtlasApiError ? error.code : classifySupabaseError(error, 'auth').code;
}

export async function signIn(form: FormData) {
  const locale = localeFrom(form);
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  let errorCode: string | null = null;
  try {
    if (!email || password.length < 8) throw new AtlasApiError('INVALID_REQUEST', 400);
    const client = await authClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    errorCode = loginError(error);
  }
  if (errorCode) redirect(`/login?error=${encodeURIComponent(errorCode)}&lang=${locale}`);
  redirect('/');
}

export async function signUp(form: FormData) {
  const locale = localeFrom(form);
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  let destination: string | null = null;
  let errorCode: string | null = null;
  try {
    if (!email || password.length < 8) throw new AtlasApiError('INVALID_REQUEST', 400);
    const requestHeaders = await headers();
    const origin = requestHeaders.get('origin');
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
    const protocol = requestHeaders.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
    const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || origin || (host ? `${protocol}://${host}` : null);
    if (!siteOrigin) throw new AtlasApiError('SUPABASE_NOT_CONFIGURED', 503);
    const redirectTo = new URL('/auth/callback', siteOrigin).toString();
    const client = await authClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    destination = data.session ? '/' : `/login?notice=confirm&lang=${locale}`;
  } catch (error) {
    errorCode = loginError(error);
  }
  if (errorCode) redirect(`/login?error=${encodeURIComponent(errorCode)}&lang=${locale}`);
  redirect(destination || '/');
}
