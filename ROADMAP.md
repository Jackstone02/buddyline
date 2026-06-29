# Buddyline — Roadmap / Not-Yet-Implemented

A step-by-step backlog of features that are **not built yet** (or only partially wired), ordered
by recommended priority. Each item notes what already exists so we can pick it up cleanly.

Legend: `[ ]` todo · `[~]` partial · `[x]` done
Status as of 2026-06-22. See [ARCHITECTURE.md](ARCHITECTURE.md) for what's already complete and
[UPDATES.md](UPDATES.md) for the change log.

---

## Phase 1 — Quick wins & correctness (small, high impact)

_Ordered by dependency: completed items first, then enable social auth before wiring social
features, then push notifications._

- [x] **1.1 Version-control email templates** (confirmation + reset password).
  Done — `supabase/templates/{confirmation,recovery}.html` + config; deploy with
  `supabase config push`. See [docs/WORKFLOW.md](docs/WORKFLOW.md).

- [x] **1.2 Confirm email-confirmation setting.**
  Verified against the live project: `mailer_autoconfirm = false` → **email confirmation is ON
  (required)**. README was correct; the SignUpScreen comment was cleaned up (the code already
  branches on `data.session` and correctly shows "Check Your Email"). `config.toml` has
  `enable_confirmations = true`, matching live.
  - [ ] Remaining: verify the email-confirmation **deep-link bridge** works end-to-end
    (Site URL + redirect URLs + GitHub Pages `email-confirmation.html`).

- [x] **1.3 Enable Google & Apple auth providers (backend).** _(verified live 2026-06-24)_
  - [x] **Google enabled** (`external.google = true`). OAuth Web client in the `buddyline` GCP
    project; redirect `com.buddyline.app://auth/callback` whitelisted. Test on a **dev build**.
  - [x] **Apple enabled** (`external.apple = true`). Native flow — App ID `com.buddyline.app` with
    Sign In with Apple capability + bundle id added to Supabase Client IDs (no Service ID/key
    needed for native). Team ID `7D6DAPU3H2`. Test on a **real iOS device**.

- [x] **1.4 Capture display name for Google/Apple signups.**
  Done — social users no longer end up nameless.
  - New helper [src/lib/profile.ts](src/lib/profile.ts) (`formatAppleName`, `nameFromUserMetadata`,
    `setDisplayNameIfEmpty`).
  - Apple's `credential.fullName` captured at sign-in in [SignInScreen](src/screens/auth/SignInScreen.tsx)
    and [SignUpScreen](src/screens/auth/SignUpScreen.tsx).
  - [SocialOnboarding](src/screens/auth/SocialOnboardingScreen.tsx) now has a required name field,
    prefilled from the profile (Apple) or `user_metadata` (Google). Covers email users too.

- [x] **1.5 Push notifications — code complete & deployed.** _(corrected: was wrongly listed as unwired)_
  `registerPushToken` IS called in [App.tsx](App.tsx) on profile load; SplashScreen/sign-in set the
  profile. The [send-notification edge fn](supabase/functions/send-notification/index.ts) is
  **deployed & ACTIVE** and handles INSERT/UPDATE on `messages`, `dive_requests`, `bookings`.
  - [ ] **Confirm by device test** (the only reliable check): send a message between two accounts
    on a physical device and see if a push arrives. If yes → done.
  - [ ] Only if it fails: check **Database → Webhooks** in the dashboard — a webhook should exist on
    `messages`/`bookings`/`dive_requests`. Note: dashboard-created webhooks auto-include an
    `Authorization` header (anon/service key = valid JWT), so `verify_jwt = true` is normally fine;
    this only breaks if the header is missing. Don't disable `verify_jwt` unless necessary.

---

## Phase 2 — Cleanup (small, low-risk)

> Correction (verified 2026-06-22): the two buddy models are **NOT** redundant — keep both.
> - **Dive Request** = targeted 1:1 ("dive with this specific person"), created from BuddyProfile.
> - **Dive Session** = open 1:many ("anyone can join"), created from Home/Dashboard.
> Likewise `MyBookings` (Beginner tab → lesson `bookings`) and `MyActivity` (Certified tab →
> `dive_requests` + `dive_sessions`) are intentional **role-specific** Schedule tabs, not dupes.

- [ ] **2.1 Delete the orphaned `MyDiveRequestsScreen.tsx`.**
  Dead code: never imported, never registered in a navigator, no `navigate()` entry point. It was
  superseded by [MyActivityScreen](src/screens/shared/MyActivityScreen.tsx), which already shows
  both dive requests and sessions. Safe to delete (no runtime references).

- [ ] **2.2 Verify certified users can see their lesson bookings.**
  `MyActivity` (the certified "My Dives" tab) fetches `dive_requests` + `dive_sessions` but **not**
  `bookings`. If a certified user books a lesson with an instructor, confirm it surfaces somewhere
  in their tabs; if not, add it. *(Verify first — may already be handled.)*

- [ ] **2.3 Re-enable Map view.**
  `MapView` is commented out in [FindScreen](src/screens/shared/FindScreen.tsx) ("re-enable when
  running on native"). Lat/long are already collected & stored. Re-enable on native; ensure the
  Google Maps key is restricted (see [UPDATES.md] security note).

---

## Phase 3 — New V2 features (schema already exists, no UI)

Each has tables + RLS ready in the baseline migration; only the UI/flows are missing.

- [ ] **3.1 Ratings & reviews.** `ratings` table ready (one per booking). Add post-booking/
  post-dive rating flow + display average on buddy/instructor profiles. *(High trust value.)*
- [ ] **3.2 Dive logs.** `dive_logs` table ready. Personal logbook: list + create + detail.
- [ ] **3.3 Group dives.** `group_dives` + `group_dive_members` ready. Organize/join group dives.
- [ ] **3.4 Dive shop locator.** `dive_shops` ready (admin-populated). Admin CRUD + user
  browse/map.
- [ ] **3.5 SOS / live location share.** `sos_sessions` + `sos_watchers` ready (realtime on).
  Share live location with watchers during a dive; watcher view. *(Safety-sensitive — design
  carefully.)*

---

## Phase 4 — Marketplace & payments (largest scope)

- [ ] **4.1 Marketplace.** `marketplace_shops/listings/orders/reviews` ready. Seller shop setup,
  listing creation with photo upload, browse/search, purchase flow, order tracking, seller reviews.
- [ ] **4.2 Payments (Stripe).** Stub columns ready (`stripe_customer_id`, `payment_intent_id`,
  `amount_paid_cents` on bookings & orders). Integrate Stripe for paid bookings and marketplace
  orders.

---

## 🚀 Pre-Launch Checklist

Do these (most are dashboard/device tasks) before going live:

**Auth**
- [x] Google provider enabled (live).
- [ ] Apple provider enabled — Apple Developer Portal + Supabase. App side already configured
  (`usesAppleSignIn: true`, `expo-apple-authentication`, bundle `com.buddyline.app`). Steps in
  [docs/WORKFLOW.md](docs/WORKFLOW.md) Part D.
- [ ] Deploy branded email templates: `supabase config push` (pushes the whole `[auth]` section —
  review first).
- [ ] Device-test: email confirm deep-link, Google sign-in (needs a dev build, not Expo Go),
  Apple sign-in (real iOS device), push notifications.

**Data reset (do LAST, right before launch)**
1. [ ] Back up: `supabase db dump --data-only -f prod-backup.sql`
2. [ ] Wipe test data: run [supabase/reset-production.sql](supabase/reset-production.sql) in the SQL Editor.
3. [ ] Seed launch data: edit + run [supabase/seed-production.sql](supabase/seed-production.sql)
   (set your real admin email first).
4. [ ] (Optional) clear storage files — see the commented block in reset-production.sql.

**Security / build**
- [ ] Restrict the Google Maps + Firebase API keys in Google Cloud (package + SHA-1 / bundle id).
- [ ] Production build via EAS (`eas build --profile production --platform all`).

---

## How we'll work
Pick the top unchecked item, implement it on a branch, verify (`npm run typecheck` + smoke test),
update its checkbox here and add an entry to [UPDATES.md](UPDATES.md), then move to the next.
