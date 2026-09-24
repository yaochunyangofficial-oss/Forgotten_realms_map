# DND Map — made by Martin Y — v0.2.0

Traditional Chinese / English interactive Faerûn campaign map. Next.js App Router,
React, Supabase Auth + Postgres; ready to connect to a GitHub repository and Vercel.

## 本次狀態

- 中英文介面、記住語言選擇、地名與路線訊息切換。
- GM 編輯資訊、私密筆記與陣營疆界；玩家只能編輯自己的筆記。
- 已移除 ChatGPT 平台登入與 Cloudflare D1 依賴。
- **尚未部署到 Vercel、尚未連接實際 Supabase、尚未搬入線上戰役資料。**
- 舊版 Sites 網站繼續保有原資料。不要刪除它，直到匯入與權限驗證完成。
- 混合路段模式、token/sticker、fog of war 留待後續版本。

## Set up / 設定

1. Create a Supabase project you own. Execute `supabase/schema.sql` in its SQL editor.
2. In Supabase Authentication → Users, create the GM and player users with their
   chosen emails/passwords (the app currently supports password sign-in, not public sign-up).
3. Copy `.env.example` to `.env.local` and set its three values from that project.
   `SUPABASE_SERVICE_ROLE_KEY` is server-only; never expose it in browser code or commit it.
4. Node 22.13+ and pnpm 11.25: `pnpm install --frozen-lockfile`, then `pnpm dev`.
5. Validate with `pnpm typecheck`, `pnpm test`, and `pnpm build`.
6. Push this folder to a new/private GitHub repository. In Vercel, import that repo
   as a Next.js project and configure the same three environment variables for the
   intended deployment environments. Deploy, then verify login/create/join/save on the live URL.

```sh
git init -b main
git add .
git commit -m "DND Map v0.2.0: bilingual interface and Vercel migration"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

The repository contains no real credentials or campaign backups. Keep backups out of Git.

## Existing campaign migration / 既有戰役搬移

1. On the original Sites map, sign in as the GM and select **匯出戰役備份**.
   This exports the current map, factions, territory polygons, GM notes, and the
   signed-in user's notes. It includes unsaved map edits currently on screen.
2. On the new app, sign in and select **匯入戰役備份**. Import creates a new campaign
   owned by this signed-in user and issues a new invitation code. It does not
   overwrite the original campaign.
3. Check location count, notes and territories before inviting players.
4. Existing ChatGPT membership identities and other users' personal notes cannot
   be mapped automatically to Supabase identities. Re-invite players with the new
   code. Other users' private notes are not included in the GM's backup.

The original map's baked-in printed geographic names are English in both modes;
interactive labels and the app interface switch languages. Custom notes and faction
names are user content and are never machine-translated.

## Security model

Next.js verifies the Supabase identity using `auth.getUser()` on each API request.
The server enforces ownership and membership. Player responses omit hidden places,
GM notes and invitation codes. Notes are scoped to the authenticated user.
Postgres tables use RLS with direct `anon`/`authenticated` access revoked; only the
server service role can access them. Save uses optimistic revision checks.
Imports validate structure and regenerate ownership/invitation metadata.

## Credits

Base map © Wizards of the Coast / Mike Schley. Source links are shown in the app.
This is an unofficial fan utility. Map asset rights remain with their respective owners.

## References

- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://supabase.com/docs/guides/auth/server-side
- https://supabase.com/docs/reference/javascript/auth-getuser

## 驗證紀錄 / Verification

- Next.js production build and TypeScript checks passed.
- API tests passed with an in-memory Supabase query mock: unauthenticated access,
  outsider access, GM/player isolation, private notes, hidden locations, revision
  conflicts, backup import and regenerated invite codes.
- Original Sites browser preview: Chinese/English toggle, language persistence after
  reload, English place search/details and route output checked.
- Live Supabase authentication, SQL schema and Vercel deployment have not yet been
  exercised because no target resources/credentials are accessible in this session.
- Connected GitHub returned no repositories; connected Vercel returned no teams,
  and its deployment operation returned `Tool deploy_to_vercel not found`.
