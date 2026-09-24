# DND Map v0.2.0

Bilingual Traditional Chinese / English Faerûn campaign map built with Next.js App Router, React, Supabase Auth, and Supabase Postgres. The Vercel app is independent of the former ChatGPT Site; campaign data starts empty in a new Supabase project.

## Features

- Explore the Sword Coast map, search locations, view place notes, and plan road or wilderness routes.
- GM campaigns with editable place data, private GM notes, factions, territories, hidden locations, and revision-checked saves.
- Player membership through invite codes and per-player private notes.
- Campaign Fog of War with a persistent map-coordinate grid, GM paint/reveal controls, and player-visible opaque masking.
- Map-coordinate text notes and approximate rumor / POI markers with GM-private, player-private, and shared visibility.
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

In Supabase Dashboard → **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). For a running project with the prior schema, apply [`supabase/migrations/20260924_campaign_fog.sql`](supabase/migrations/20260924_campaign_fog.sql) once. Both use an idempotent `ALTER TABLE` to add the Fog JSON column. It creates:

- `public.campaigns`: GM owner, invite UUID, complete map JSON, revision, Fog JSON state, creation time.
- `public.memberships`: campaign-to-player relationship.
- `public.notes`: per-user place notes.
- `public.map_objects`: campaign-independent map notes and POI markers, with map-space x/y, optional POI radius, label/content, creator, and visibility.

RLS is enabled on all four tables. Explicit deny policies and revoked table grants prevent `anon` and `authenticated` clients from querying or changing campaign data directly. The Next.js server checks the signed-in Supabase user and campaign owner/membership before it uses its server-only secret/service-role key. It filters `gm_private` objects out of player responses and returns `player_private` objects only to their creator (plus the GM); only the creator or GM can edit/delete an object. Keep that key only in server environment variables; never send it to browser code. Do not add direct Data API policies unless the application is redesigned to enforce the same GM/player privacy rules in SQL.

Map objects use independent `map_objects` rows rather than campaign JSON, faction polygons, or location ids. Coordinates are normalized to the map image’s viewBox, so panning and zooming do not move the annotations. `lib/map-layers.ts` describes the stacking order: base map → factions → locations → Fog of War → routes → notes/POI. The SVG groups follow that order. Fog uses a sparse inverse grid representation in `campaigns.fog` (`enabled`, `baseFogged`, and exception cell indices), so fogging an entire map requires no per-cell rows. The centralized cell size is 28 map units (about 10 map miles); across the 1000 × 647 map viewBox, this yields a 36 × 24 grid. Coordinates and cell size are independent of screen size. Turning Fog off keeps the pattern. Fog reset clears only this column.

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

The automated API tests use an in-memory Supabase-shaped adapter. They cover authentication, campaign create → read → update → reload, Fog default/toggle/paint/reveal/reset/reload and player authorization, map-object create/move/resize/delete → reload, shared and private visibility, invitations, hidden places, and bilingual route calculation. They do not prove a particular Supabase project’s keys, schema, email delivery, RLS state, or Vercel settings; verify those with the live checklist above.

## Testing a Vercel Preview

1. Push this feature branch and wait for Vercel to build its branch Preview deployment.
2. Add the three required Supabase variables from the [environment-variable table](#3-set-environment-variables) to Vercel’s **Preview** environment, then redeploy the Preview if needed.
3. In Supabase Auth → URL Configuration, add that Preview deployment’s exact origin plus `/auth/callback` to **Redirect URLs**. Add a stable branch Preview domain there if your Vercel project provides one; otherwise add the current deployment URL and repeat when it changes.
4. Apply the Fog migration to the Preview database first. Sign in as GM, open **Fog of War**, turn it on, paint and reveal cells with mouse or touch drag, and reload to confirm persistence. Turn Fog off and back on to confirm its pattern is preserved. Test **Fog Entire Map** and **Reset Fog**; both show a confirmation dialog. As a player, confirm fogged areas are opaque and the Fog controls are unavailable. Add map notes and POIs to check they remain above Fog.

No new environment variables are required for Fog. Apply the Fog schema update before using the Fog API. No new RLS policies are needed: the existing server checks GM ownership, while direct client access remains denied by current RLS/grants.

## Error messages

The API returns stable error codes and logs the operation plus sanitized provider diagnostics without logging request bodies, campaign content, notes, cookies, or keys. The UI distinguishes missing Supabase configuration, missing schema, authentication, backend/network, permission, not-found, and save/conflict failures.

## Credits

Base map © Wizards of the Coast / Mike Schley. Source links are shown in the app. This is an unofficial fan utility; map asset rights remain with their respective owners.
