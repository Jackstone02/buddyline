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

## Part C — Auth config & email templates (version-controlled)

Branded email templates and auth settings live in the repo and deploy to the cloud project with
one command — **no more pasting HTML or toggling settings in the dashboard**.

### Email templates
- Source files: [supabase/templates/confirmation.html](../supabase/templates/confirmation.html)
  (signup confirmation) and [supabase/templates/recovery.html](../supabase/templates/recovery.html)
  (password reset). Both use the Supabase `{{ .ConfirmationURL }}` variable.
- Wired in [supabase/config.toml](../supabase/config.toml) under `[auth.email.template.confirmation]`
  and `[auth.email.template.recovery]` (subject + `content_path`).
- Edit the HTML in `supabase/templates/`, commit, then push (below). The root
  `email-confirmation-template.html` / `email-reset-password-template.html` are the old
  copy-paste copies and are now **superseded** by these.

### Deploying config + templates
```
supabase config push        # pushes config.toml (auth settings + email templates) to the linked project
```

> ⚠️ **`config push` pushes the WHOLE `[auth]` section, not just templates** (and has no
> `--dry-run`). Before running it, make sure `config.toml` matches your intended production
> state — especially:
> - `enable_confirmations` (email confirmation ON/OFF)
> - `site_url` and `additional_redirect_urls`
> - the `[auth.external.google]` / `[auth.external.apple]` `enabled` flags
>
> If a provider is enabled in the dashboard but `enabled = false` here, pushing will **disable
> it**. Review first. OAuth client secrets are still set via env vars / dashboard, never committed.

### Auth setup checklist (one-time, per environment)
What can be codified vs. what stays manual:

| Setting | Managed by | Notes |
|---|---|---|
| Email templates (confirm/recovery) | ✅ `config.toml` + `config push` | done |
| Email confirmation on/off, password rules | ✅ `config.toml` + `config push` | review before push |
| Site URL & redirect allow-list | ✅ `config.toml` + `config push` | keep deep links in sync |
| Google / Apple **enabled** flag | ✅ `config.toml` + `config push` | secrets stay in dashboard/env |
| Google / Apple **client secrets** | ❌ Dashboard / env vars | never commit secrets |
| Exposed schemas (`buddyline`) | ❌ Dashboard (API settings) | or via `config.toml` `[api].schemas` on push |
| Storage buckets & policies | ❌ Dashboard | `avatars`, `cert-cards`, `credentials`, `buddyline` |

---

## Part D — Enabling Google & Apple sign-in

The app code is complete; these are **dashboard-only** steps. Buddyline uses Supabase's OAuth
flow, so credentials live in the Supabase dashboard (not the repo). Reference values:

| Thing | Value |
|---|---|
| Supabase OAuth callback | `https://manwqkdbajvidgmtrvzy.supabase.co/auth/v1/callback` |
| App redirect scheme | `com.buddyline.app://auth/callback` (also allow `buddyline://`) |
| iOS / Android bundle id | `com.buddyline.app` |
| Google Cloud project | `buddyline` (project #279875257598) |

### Google
1. **Google Cloud Console** (project *Buddyline*) → APIs & Services → **OAuth consent screen**:
   External, app name "Buddyline", support email, add scopes `email` + `profile`. Add yourself as
   a test user (or publish).
2. APIs & Services → **Credentials → Create credentials → OAuth client ID** →
   Application type: **Web application** (this is the type Supabase uses — *not* Android/iOS).
   - Name: e.g. "Buddyline Supabase"
   - **Authorized redirect URIs:** `https://manwqkdbajvidgmtrvzy.supabase.co/auth/v1/callback`
   - Create, then copy the **Client ID** and **Client secret**.
3. **Supabase dashboard** → Authentication → **Providers → Google** → enable → paste the Client ID
   and Client secret → Save.
4. Supabase → Authentication → **URL Configuration** → add `com.buddyline.app://auth/callback`
   (and `buddyline://`) to the redirect allow-list.
5. (Optional, keep config in sync) set `[auth.external.google] enabled = true` in
   [config.toml](../supabase/config.toml) — secret stays in the dashboard, not the file.
6. Test on a device: tap "Continue with Google".

### Apple (needs a paid Apple Developer account; iOS/TestFlight only)
The app uses the **native** flow (`expo-apple-authentication` → `signInWithIdToken`), which needs
only the App ID + the bundle id in Supabase. A Service ID and `.p8` key are **only** required for
the web/OAuth redirect flow (web or Android) — skip them for this iOS-native app.

1. **Apple Developer** → Certificates, Identifiers & Profiles → Identifiers:
   - App ID `com.buddyline.app` → enable the **Sign In with Apple** capability → Save.
2. **Supabase dashboard** → Authentication → **Providers → Apple** → Enable:
   - **Client IDs:** add `com.buddyline.app` (this is all the native flow needs).
   - Leave the Secret / Service ID / Key fields **blank**. → Save.
3. (Optional) set `[auth.external.apple] enabled = true` in config.toml.
4. Test on a **real iOS device / TestFlight** (not Expo Go, not Android).

> Only if you later add Apple sign-in on **web or Android**: create a Services ID
> (e.g. `com.buddyline.signin`) with return URL
> `https://manwqkdbajvidgmtrvzy.supabase.co/auth/v1/callback`, a Sign in with Apple `.p8` key,
> and fill the Secret fields in Supabase (Team ID `7D6DAPU3H2`, Key ID, Service ID, key).

> After enabling, the social buttons work with no code changes — including the display-name
> capture added in ROADMAP 1.4 (Apple `fullName` + Google `user_metadata`).

---

## Environment variables
The app reads these at runtime (set in `.env`, gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=https://manwqkdbajvidgmtrvzy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
For EAS cloud builds, add the same values as EAS environment variables / secrets in the Expo
dashboard so production binaries point at the right project.
