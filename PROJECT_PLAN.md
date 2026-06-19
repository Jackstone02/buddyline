# Buddyline — Project Plan: Migration Automation, Build Automation & Optimization

## Context

Buddyline is an Expo / React Native (SDK 54) freediving community app backed by Supabase
(custom `buddyline` schema). Today the database is managed by **manually pasting**
`schema.sql` (944 lines, idempotent) and `seed.sql` into the Supabase dashboard — error-prone
and not version-tracked. Builds are run by hand via EAS; there is no CI anywhere.

This plan brings Buddyline in line with the COURTSPACE project's workflow: the **Supabase CLI**
for migrations, **EAS Workflows** for automatic builds, plus a **light, safe optimization** pass
and documentation.

### Decisions (confirmed)
- **Migrations:** CLI workflow like COURTSPACE (no GitHub CI for the DB).
- **Builds:** EAS Workflows (Expo-native cloud CI on git push).
- **Optimization:** Light & safe only (no behavior changes, no risky refactors).

### Safety constraint
The remote DB **already contains** all tables. The migration setup must be **idempotent and
non-destructive** — running it against the live project must not drop or duplicate anything.
`schema.sql` already uses `IF NOT EXISTS` / `OR REPLACE`, which makes this safe.

---

## Part 1 — Supabase CLI Migration Workflow (like COURTSPACE)

Convert the manual schema.sql process into a CLI-driven, version-tracked workflow.

### Files to create
- **`supabase/config.toml`** — mirror COURTSPACE, adjusted for Buddyline:
  - `project_id = "buddyline"`
  - `[api] schemas = ["public", "graphql_public", "buddyline"]` and
    `extra_search_path = ["public", "extensions", "buddyline"]`
  - `[db] major_version = 17` (confirm against remote: `SHOW server_version;`)
  - `[db.migrations] enabled = true`
  - `[db.seed] enabled = true`, `sql_paths = ["./seed.sql"]` (local-only seeding)
- **`supabase/migrations/0001_initial_schema.sql`** — the **baseline migration**; content =
  current `schema.sql` verbatim (already idempotent). Generate the real timestamped name with
  `supabase migration new initial_schema`, then paste the content in.
- **`supabase/seed.sql`** — move `seed.sql` here. Seed runs only on local `supabase db reset`,
  never on `db push` to prod, so prod data is untouched.
- Keep the existing edge function `supabase/functions/send-notification/index.ts` in place.
- Leave root `schema.sql` / `seed.sql` for one cycle (or replace with a pointer note).

### One-time linking (run by user)
```bash
supabase login
supabase link --project-ref manwqkdbajvidgmtrvzy
supabase db push        # baseline is idempotent → safe against the live DB
```
Remote migration-history is empty, so `db push` applies `0001` once and records it. Idempotent
DDL means existing objects are not recreated/dropped. Alternative:
`supabase migration repair --status applied 0001`.

### Going forward
`supabase migration new <name>` → edit the SQL → `supabase db push`. (Same loop as COURTSPACE.)

---

## Part 2 — Builds (manual; CI optional)

**Decision:** builds are run **manually** with EAS Build for now — automated CI was skipped.
```
eas build --profile preview    --platform android
eas build --profile production  --platform all
```
Automating builds on push later (EAS Workflows) is documented as an **optional** step in
`docs/WORKFLOW.md` (Part B optional). It would add `.eas/workflows/build.yml` and connect the
GitHub repo to the Expo project — not done in this change set.

---

## Part 3 — Light & Safe Optimizations (no behavior changes)

1. **Generated DB types** — add `src/types/database.types.ts` and a script in `package.json`:
   `"gen:types": "supabase gen types typescript --linked --schema buddyline > src/types/database.types.ts"`.
   Keep hand-written `src/types/index.ts` as the app-facing types.
2. **DB indexes** — new migration `supabase/migrations/0002_indexes.sql`, all
   `CREATE INDEX IF NOT EXISTS` (idempotent), for hot paths:
   - `messages` by `(sender_id, recipient_id, created_at)`
   - `bookings` by `(instructor_id, status)` and `(customer_id, status)`
   - `availability_slots` by `(instructor_id, date)`
   - foreign-key columns missing covering indexes
3. **Supabase client hardening** in `src/lib/supabase.ts` — dev-only warning when the
   `placeholder.supabase.co` fallback is in use, so a missing `.env` fails loudly.
4. **Conservative dead-code sweep** — remove only provably unused imports/files. The legacy
   dive-request vs new session model duplication is **flagged for later**, not touched now.
5. **Convenience npm scripts** — `db:push`, `db:reset` wrappers.

---

## Part 4 — Documentation

- **`docs/WORKFLOW.md`** — operational guide (create→push migrations, EAS build flow, env-var
  setup, one-time link/connect steps). Modeled on COURTSPACE's `docs/deployment.md`.
- **`UPDATES.md`** — running updates log (this file's companion; see seeded first entry).
- Update **`README.md`** — point the Supabase section at the CLI workflow (replace "paste into
  SQL Editor"), link to `docs/WORKFLOW.md`.

---

## Critical files

| Purpose | Path |
|---|---|
| Schema source (→ baseline migration) | `schema.sql` |
| Seed (→ supabase/seed.sql) | `seed.sql` |
| EAS profiles | `eas.json` |
| Scripts / deps | `package.json` |
| Supabase client | `src/lib/supabase.ts` |
| App types | `src/types/index.ts` |
| Reference (COURTSPACE) | `D:\NEWPROJECT3 - COURTSPACE\supabase\config.toml`, `docs\deployment.md` |

---

## Verification

1. `supabase migration list` parses; `supabase start` applies `0001` + `0002` + seed locally, no errors.
2. Non-destructive: after `supabase link`, `supabase db push --dry-run` confirms it only *adds*
   the baseline record / indexes and drops nothing.
3. `npm run gen:types` produces a non-empty `database.types.ts`; `npx tsc --noEmit` passes.
4. `npm run start` boots; sign-in / messaging / bookings smoke-tested against live DB.
5. `eas workflow:validate` (or a manual run) queues a preview build successfully.

## Out of scope (flagged for later)
- Consolidating legacy `dive_requests` with the new session model (moderate refactor).
- GitHub Actions CI for DB migrations (chose COURTSPACE-style manual `db push`).
