# Buddyline — Database & Build Workflow

How to manage the Supabase database with versioned migrations (no more pasting SQL into the
dashboard) and how automated builds work. Modeled on the COURTSPACE project's setup.

---

## Part A — Supabase Migrations (CLI workflow)

### What changed
Previously the schema was applied by pasting `schema.sql` into the Supabase SQL Editor by hand.
Now the database is **version-controlled** under `supabase/` and applied by the Supabase CLI:

```
supabase/
├── config.toml                          # CLI config (exposes the `buddyline` schema)
├── migrations/
│   └── 0001_initial_schema.sql          # baseline = the full current schema (idempotent)
├── seed.sql                             # local-only dev data
└── functions/send-notification/         # edge function (unchanged)
```

> The root `schema.sql` / `seed.sql` are kept temporarily for reference and are **superseded**
> by the files under `supabase/`. Treat `supabase/migrations/` as the source of truth.

### Prerequisites (one time)
1. Install the Supabase CLI (already present on this machine: `supabase --version`).
   Otherwise: https://supabase.com/docs/guides/cli
2. Log in: `supabase login`
3. Link this repo to the cloud project (ref `manwqkdbajvidgmtrvzy`):
   ```
   npm run db:link        # = supabase link --project-ref manwqkdbajvidgmtrvzy
   ```
   You'll be asked for the database password once (stored locally, not committed).

### Applying the baseline to the existing live database
The baseline migration is **fully idempotent** (`IF NOT EXISTS` / `OR REPLACE` /
`DROP POLICY IF EXISTS`), so pushing it against your already-populated production database does
not drop or duplicate anything.

```
npm run db:push:dry      # = supabase db push --dry-run   (review what will run first)
npm run db:push          # = supabase db push             (apply + record migration)
```

Because the remote migration-history table is empty, the first `db push` records `0001` as
applied. If you'd rather mark it applied **without** re-running the SQL (the objects already
exist), use:
```
supabase migration repair --status applied 0001
```

### Making a schema change (the everyday loop)
1. Create a new migration file:
   ```
   npm run db:new add_dive_log_photos      # = supabase migration new add_dive_log_photos
   ```
2. Edit the generated file in `supabase/migrations/` — write only the *delta* (the new/changed
   objects), idempotently where practical.
3. Apply it:
   ```
   npm run db:push:dry     # review
   npm run db:push         # apply to cloud
   ```
4. Commit the migration file with your code change. Anyone who pulls can re-apply with `db:push`.

### Local full-stack development (optional)
To run Postgres + Auth + Studio locally with seed data:
```
supabase start           # applies ALL migrations + seed.sql, prints local URLs
supabase db reset        # wipe + re-apply migrations + seed (great for a clean slate)
supabase stop
```
> `seed.sql` runs **only** on local `db reset` / `start` — it never runs on `db push`, so
> production data is safe.

### Generating TypeScript DB types
Keep DB types in sync after schema changes:
```
npm run gen:types        # writes src/types/database.types.ts from the linked DB (buddyline schema)
```
The hand-written `src/types/index.ts` stays the app-facing source; generated types are for
reference and compile-time safety.

### Quick command reference
| Command | Does |
|---|---|
| `npm run db:link` | Link repo to the cloud project (one time) |
| `npm run db:new <name>` | Scaffold a new migration file |
| `npm run db:push:dry` | Preview pending migrations against cloud |
| `npm run db:push` | Apply pending migrations to cloud |
| `npm run db:reset` | Local: wipe & re-apply migrations + seed |
| `npm run db:diff` | Diff local DB vs migrations (detect drift) |
| `npm run gen:types` | Regenerate `src/types/database.types.ts` |

---

## Part B — Builds (manual)

Builds are run **manually** with EAS Build. (Automated CI builds are available but optional —
see the section below.)

### One-time setup
1. Install the EAS CLI: `npm i -g eas-cli`
2. Log in: `eas login`
3. iOS only: run `eas credentials` once to set up Apple signing (interactive).
   The project is already configured in `app.json` / `eas.json` (EAS project id `9f683cf8-…`).

### Building
```
eas build --profile preview    --platform android   # internal test APK
eas build --profile preview    --platform ios        # internal test build
eas build --profile production  --platform all        # store-ready builds
```

### Profiles (`eas.json`)
| Profile | Use |
|---|---|
| `development` | Dev client builds for debugging |
| `preview` | Internal testers (APK / ad-hoc) |
| `production` | Store-ready builds; `autoIncrement` bumps the build number |

### Environment for builds
Add the `EXPO_PUBLIC_*` values (see below) as EAS environment variables / secrets in the Expo
dashboard so the binaries point at the right Supabase project.

---

## Part B (optional) — Automating builds later with EAS Workflows

Not set up today (builds are manual). If you later want builds to run automatically on push,
EAS Workflows is the Expo-native way to do it — no separate CI server needed.

1. Create `.eas/workflows/build.yml`:
   ```yaml
   name: Build on push to main
   on:
     push:
       branches: [main]
   jobs:
     build_android:
       type: build
       params: { platform: android, profile: preview }
     build_ios:
       type: build
       params: { platform: ios, profile: preview }
   ```
2. Connect the GitHub repo to the Expo project (Expo dashboard → Project → GitHub).
3. Pushes to `main` then trigger preview builds automatically. Tune the branch/platforms/profile
   as needed. Docs: https://docs.expo.dev/eas/workflows/get-started/

---

## Environment variables
The app reads these at runtime (set in `.env`, gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=https://manwqkdbajvidgmtrvzy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
For EAS cloud builds, add the same values as EAS environment variables / secrets in the Expo
dashboard so production binaries point at the right project.
