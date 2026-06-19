# Buddyline — Updates Log

A running log of notable changes to the project. Newest entries on top.

---

## 2026-06-19 — Type Safety Pass & Bug Fixes

### Tooling — **Done**
- Generated `src/types/database.types.ts` from the linked DB (`npm run gen:types`).
- Added a `typecheck` npm script (`tsc --noEmit`) — Metro/Babel never type-checks, so these
  bugs were invisible before.
- Excluded the Deno edge function (`supabase/functions`) from the app `tsconfig` (it runs in a
  different runtime; it was producing 5 false-positive `Deno`/esm.sh errors).
- Decision: did **not** wire `createClient<Database>` — the generated types are nullable/loose
  vs. the strict hand-written app types, which cascaded 20+ errors. Generated types kept as
  reference only.
- Result: `npm run typecheck` is now **clean (0 errors)**, down from 14 pre-existing errors.

### Bug fixes — **Done** (all previously latent; Metro never surfaced them)
- **Dive-session status `'done'` → `'completed'` (data-integrity bug).** App code wrote/read
  `'done'`, but the schema check constraint only allows `open/full/cancelled/completed`, so
  auto-close writes were silently rejected and expired sessions never moved to "Past". Fixed in
  `InstructorDashboardScreen`, `HomeCertifiedScreen`, `SessionsListScreen`, and `MyActivityScreen`
  (both the writes and the `=== 'done'` reads).
- **Instructor Dashboard dead stat cards.** Pending/Upcoming/Completed navigated to a
  non-existent `'MyActivity'` route (silent no-op). Now navigate to the `Schedule` tab via a
  proper composite navigation type.
- **MyDiveRequests avatars never rendered.** Passed `uri=` to `UserAvatar` (which expects
  `avatarUrl`), so it always fell back to initials despite fetching `avatar_url`. Fixed prop name.
- **`DiveRequestStatus.completed` missing** from 3 status-label maps (DiveRequestDetail,
  MyDiveRequests, MyActivity) — a `completed` request rendered blank/undefined. Added the entry.
- **FindScreen `mapRef` undefined** — referenced but never declared (latent `ReferenceError` if
  a map marker was pressed). Declared the ref (map is currently disabled; no behavior change).
- **Notifications handler** missing `shouldShowBanner` / `shouldShowList` required by the current
  expo-notifications API — foreground banners could fail to display. Added both fields.

---

## 2026-06-18 — Migration & Build Automation + Docs

### Database / Migrations — **Done**
- Adopted the Supabase CLI workflow (like the COURTSPACE project), replacing the manual
  "paste schema.sql into the dashboard" process.
- Added `supabase/config.toml` exposing the `buddyline` schema (validated: parses cleanly).
- Added baseline migration `supabase/migrations/0001_initial_schema.sql` (full current schema,
  idempotent — includes all indexes, so no separate index migration was needed).
- Moved seed data to `supabase/seed.sql` (runs on local `db reset` only, never on prod push).
- Added npm scripts: `db:link`, `db:new`, `db:push`, `db:push:dry`, `db:reset`, `db:diff`,
  `gen:types`.
- **Linked** the repo to the cloud project (`manwqkdbajvidgmtrvzy`) and marked the baseline
  applied via `supabase migration repair --status applied 0001` (tables already existed, so no
  SQL was re-run). `supabase migration list` now shows `0001 | 0001` (local = remote).
- Everyday loop going forward: `npm run db:new <name>` → edit → `npm run db:push`.

### Builds — **Manual (by choice)**
- Builds are run manually with EAS Build (`eas build --profile preview --platform android`).
- Automated CI builds via EAS Workflows were intentionally skipped for now; documented as an
  **optional** future step in `docs/WORKFLOW.md` (Part B optional).

### Docs — **Done**
- `ARCHITECTURE.md` — whole-project overview (stack, flow, data model, setup).
- `docs/WORKFLOW.md` — migration + build operations guide.
- `PROJECT_PLAN.md` — the plan for this change set.
- `README.md` — Supabase section updated to the CLI workflow.

### Deferred (out of scope for now)
- Consolidating the legacy `dive_requests` model with the new `dive_sessions` model.
- GitHub Actions CI for DB migrations (using COURTSPACE-style manual `db push` instead).

---

## How to update this log
Add a new dated section at the top for each meaningful change set. Keep entries short and
grouped by area (Database, Builds, Optimization, Docs). Mark status as **Planned**,
**In progress**, or **Done**.
