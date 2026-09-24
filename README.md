# DND Map v0.2.0

Bilingual Traditional Chinese / English Faerûn campaign map built with Next.js App Router, React, Supabase Auth, and Supabase Postgres. The Vercel app is independent of the former ChatGPT Site; campaign data starts empty in a new Supabase project.

## Features

- Explore the Sword Coast map, search locations, view place notes, and plan road or wilderness routes.
- GM campaigns with editable place data, private GM notes, factions, territories, hidden locations, and revision-checked saves.
- Player membership through invite codes and per-player private notes.
- Import/export JSON campaign backups, bilingual UI, and saved language preference.

## Local development

Requirements: Node.js 22.13+ and pnpm 11.25.

```sh
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Fill the values in `.env.local` as described under [Supabase setup](#supabase-setup). Then run:

```sh
pnpm dev
```

The app is available at `http://localhost:3000`.

## Fresh Supabase setup

Use a new Supabase project for a clean test deployment. The app does not need existing campaign data.

### 1. Initialize the database

In Supabase Dashboard → **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once. It creates:

- `public.campaigns`: GM owner, invite UUID, complete map JSON, revision, creation time.
- `public.memberships`: campaign-to-player relationship.
- `public.notes`: per-user place notes.

RLS is enabled on all three tables. Explicit deny policies and revoked table grants prevent `anon` and `authenticated` clients from querying or changing campaign data directly. The Next.js server checks the signed-in Supabase user and campaign owner/membership before it uses its server-only secret/service-role key. Keep that key only in server environment variables; never send it to browser code. Do not add direct Data API policies unless the application is redesigned to enforce the same GM/player privacy rules in SQL.

### 2. Configure Supabase Auth

In Supabase Dashboard → **Authentication → Sign In / Providers**, enable **Email**. The app supports email/password sign-in and account creation.

In **Authentication → URL Configuration**:

- Set **Site URL** to the app origin, such as `http://localhost:3000` during local development or your Vercel production URL after deployment.
- Add callback URLs to **Redirect URLs**: `http://localhost:3000/auth/callback`, your production URL ending in `/auth/callback`, and any Vercel preview URL patterns you plan to use.
- Keep email confirmation enabled for production and configure reliable email delivery. A new user follows the confirmation link before signing in. For a private test project, you may turn confirmation off if you want new accounts to sign in immediately.

The callback exchanges Supabase’s one-time code for the authenticated cookie session. Campaign API requests use `auth.getUser()` to verify that session; no account or campaign owner is inferred from client input.

### 3. Set environment variables

Copy `.env.example` to `.env.local` for local use. Get the project URL, publishable key, and secret key from Supabase Dashboard → **Project Settings → API Keys**.

| Variable | Required | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser-safe key used by the server-side Auth client. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted. |
| `SUPABASE_SECRET_KEY` | Yes | Server-only elevated database access. The legacy `SUPABASE_SERVICE_ROLE_KEY` JWT is also accepted. |
| `NEXT_PUBLIC_SITE_URL` | No | Preferred app origin for email confirmation callbacks; when unset, the request origin is used. |

Never commit `.env.local`, a Supabase secret/service-role key, user passwords, or real credentials. The repository’s `.gitignore` excludes `.env*` except `.env.example`.

### 4. Configure Vercel

Import `yaochunyangofficial-oss/Forgotten_realms_map` as a Next.js project. In Vercel → **Project Settings → Environment Variables**, add the first three variables above (including the server-only `SUPABASE_SECRET_KEY`) to the intended **Development**, **Preview**, and **Production** environments. Set `NEXT_PUBLIC_SITE_URL` to the corresponding app origin if using it. Do not give the secret key a `NEXT_PUBLIC_` prefix. Redeploy after changing environment variables.

After deployment, open `/login`, create an account, and sign in. With an empty database, the map home offers **Create my GM campaign**. Creation returns the new campaign’s map, revision, and invite code in the same response, so the user enters it without a follow-up load. The invite code is shown in the GM sidebar. A player creates their own account, signs in, enters that code, and joins. The app can only persist campaigns after the schema and all required environment variables are configured.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

The automated API tests use an in-memory Supabase-shaped adapter. They cover authentication, create → read → update → reload persistence, revision conflicts, player joining, private notes, hidden places, authorization, and backup import. They do not prove a particular Supabase project’s keys, schema, email delivery, RLS state, or Vercel settings; verify those with the live checklist above.

## Error messages

The API returns stable error codes and logs the operation plus sanitized provider diagnostics without logging request bodies, campaign content, notes, cookies, or keys. The UI distinguishes missing Supabase configuration, missing schema, authentication, backend/network, permission, not-found, and save/conflict failures.

## Credits

Base map © Wizards of the Coast / Mike Schley. Source links are shown in the app. This is an unofficial fan utility; map asset rights remain with their respective owners.
