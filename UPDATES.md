# Buddyline — Updates Log

A running log of notable changes to the project. Newest entries on top.

---

## 2026-06-22 — Phase 1: Social display name + push verification

### 1.4 Capture display name for Google/Apple signups — **Done**
- Added [src/lib/profile.ts](src/lib/profile.ts): `formatAppleName`, `nameFromUserMetadata`,
  `setDisplayNameIfEmpty` (never overwrites an existing name).
- Apple `credential.fullName` now captured at sign-in (SignIn + SignUp screens).
- SocialOnboarding gained a required, prefilled name field (from profile for Apple, from
  `user_metadata` for Google) — also benefits email users. Typecheck clean.

### Launch prep — production reset/seed scripts — **Done (scripts) / run at launch**
- Added `supabase/reset-production.sql` (DESTRUCTIVE: truncates all 24 `buddyline` tables +
  clears `auth.users`, in a transaction) and `supabase/seed-production.sql` (real launch data
  only: promote first admin + optional dive shops). Both are manual-only (outside `migrations/`,
  not referenced by `config.toml` seed), so they never auto-run.
- Test data stays in `supabase/seed.sql` (dev/local only). Run order at launch: backup →
  reset-production.sql → seed-production.sql.

### 3.2 Dive logs — **Done**
- New `DiveLog` type + routes (`DiveLogs`, `DiveLogForm`).
- `DiveLogsListScreen` (logbook with dive-count + personal-best summary) and `DiveLogFormScreen`
  (add/edit/delete: date, location, depth, duration, discipline, notes).
- Entry point: Profile → "My Dive Log". Uses existing `dive_logs` table + RLS (no schema change).
- Verified: tsc clean; expo export bundles 1302 modules.

### 3.1 Ratings & reviews — **Done**
- New `Rating` type + reusable `StarRating` component (display with half-stars / tappable input).
- Customer can rate their instructor after a `completed` booking (BookingDetailScreen): star
  picker + optional comment → `ratings` insert; shows the existing rating read-only once submitted
  (one per booking via `unique(reviewer_id, booking_id)`).
- InstructorProfileScreen shows the average rating in the hero + a Reviews list.
- Verified: tsc clean; expo export bundles 1300 modules.

### Branding + map + app.json fix
- **Map view re-enabled** in FindScreen (Phase 2.3): platform-safe (native only; web bundle stays
  intact via conditional `require`), list⇄map toggle, markers → profile, "locate me". Typecheck clean.
- **New logos wired:** splash → `buddyline-2.png` (white bg), web favicon → `buddyline-2.png`.
  App **icon** still pending a **square 1024×1024 opaque** source (the logos aren't square);
  Android adaptive foreground needs a **transparent** PNG. Both flagged.
- **Bug fix:** `app.json` Android deep-link intent filter pointed at the wrong Supabase project
  (`sivmbewtkqlvcbilgyjw` → corrected to `manwqkdbajvidgmtrvzy`).
- Note: `MyDiveRequestsScreen` kept (user opted not to delete the orphaned screen).

### 1.3 Enable Google + Apple providers — **Done (both live)**
- **Google:** OAuth Web client in the `buddyline` GCP project, enabled in Supabase, verified
  `external.google = true`. Test on a dev build (not Expo Go).
- **Apple:** App ID `com.buddyline.app` with Sign In with Apple (+ Push Notifications) capability;
  bundle id added to Supabase Apple Client IDs. Native flow needs no Service ID/key (corrected from
  initial guidance). Verified `external.apple = true`. Team ID `7D6DAPU3H2`. Test on a real iOS device.
- Setup steps in `docs/WORKFLOW.md` Part D.

### 1.5 Push notifications — **Corrected: already code-complete & deployed**
- Earlier roadmap wrongly said `registerPushToken` was never called. It IS called in `App.tsx`
  on profile load. The `send-notification` edge function is **deployed & ACTIVE** (v3) and handles
  `messages`, `dive_requests`, `bookings` (INSERT/UPDATE).
- Remaining is config/verification only: confirm Database Webhooks point at the function and that
  they pass an Authorization header (function has `verify_jwt = true`); then device-test.

---

## 2026-06-22 — Roadmap + Version-Controlled Email Templates

### Roadmap correction — buddy models are NOT redundant — **Done**
- Verified the two buddy features are distinct & both live: `dive_requests` (targeted 1:1 from a
  buddy's profile) vs `dive_sessions` (open join). Likewise `MyBookings` (Beginner tab, lesson
  bookings) and `MyActivity` (Certified tab, buddy dives) are role-specific, not duplicates.
- Corrected ROADMAP item 2.1 (was "consolidate the models") and ARCHITECTURE.md (dive_requests
  moved from "V2 stub/legacy" to "MVP in active use").
- Only real dead code found: `MyDiveRequestsScreen.tsx` is orphaned (no nav entry; superseded by
  MyActivityScreen) → ROADMAP 2.1 is now "delete the orphaned screen".

### Auth verification (live project) — **Done**
- Queried the live `/auth/v1/settings`: **email confirmation is ON** (`mailer_autoconfirm = false`)
  — README was correct; cleaned up the misleading "confirmation is OFF" comment in SignUpScreen
  (no behavior change — the code already branches on `data.session`).
- Found **Google & Apple providers are disabled** on the backend (`external.google/apple = false`),
  so social sign-in currently fails despite complete app code. Added ROADMAP item 1.5 to enable
  them. `config.toml` already matches (both `enabled = false`), so `config push` won't change them.


### Docs — **Done**
- Added `ROADMAP.md` — step-by-step backlog of not-yet-implemented features (auth display-name
  capture, push wiring, email-confirmation decision, model consolidation, map re-enable, ratings,
  dive logs, group dives, shop locator, SOS, marketplace, payments), ordered by priority.

### Auth / Email templates — **Done (code) / action required (config push)**
- Moved branded email templates into `supabase/templates/confirmation.html` and `recovery.html`
  (superseding the root `email-*-template.html` copy-paste files).
- Wired them in `supabase/config.toml` (`[auth.email.template.*]`).
- Deploy with `supabase config push` — documented in `docs/WORKFLOW.md` (Part C), including the
  caveat that `config push` pushes the whole `[auth]` section (review OAuth/confirmation flags
  first) and an auth setup checklist of what's codifiable vs. dashboard-only.

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
