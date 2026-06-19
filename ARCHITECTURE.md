# Buddyline — Architecture & Project Overview

Buddyline is a freediving community mobile app: it connects **beginners**, **certified
divers**, and **instructors** for buddy dives, lessons, and bookings, with safety and
verification built in. This document explains how the whole project fits together — the stack,
the app flow, the data model, and how to set it up.

> Companion docs: [docs/WORKFLOW.md](docs/WORKFLOW.md) (migrations & builds),
> [PROJECT_PLAN.md](PROJECT_PLAN.md) (current change set), [UPDATES.md](UPDATES.md) (changelog),
> [README.md](README.md) (quick start).

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| App framework | Expo SDK 54 / React Native 0.81 / React 19 |
| Language | TypeScript 5.9 (strict) |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) |
| State | Zustand 5 |
| UI | React Native Paper 5 + custom theme (`src/constants/theme.ts`) |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Maps / location | react-native-maps, expo-location |
| Auth providers | Email/password, Google OAuth, Apple Sign-In |
| Notifications | expo-notifications + Firebase FCM (Android) |
| Builds | EAS Build (manual; CI optional — see docs/WORKFLOW.md) |

**Custom DB schema:** all app tables live in the `buddyline` Postgres schema (not `public`).
The Supabase client sets this in [src/lib/supabase.ts](src/lib/supabase.ts) (`db: { schema: 'buddyline' }`).

---

## 2. Directory Map

```
buddyline/
├── App.tsx                  # Entry point; deep-link handling, providers
├── index.ts                 # Expo registerRootComponent
├── app.json                 # Expo app config (bundle ids, plugins, permissions)
├── eas.json                 # EAS Build profiles (development/preview/production)
├── .eas/workflows/          # EAS Workflows CI (auto builds on push)
├── supabase/
│   ├── config.toml          # Supabase CLI config (exposes `buddyline` schema)
│   ├── migrations/          # Versioned SQL migrations (0001_initial_schema.sql …)
│   ├── seed.sql             # Local dev seed data (7 users, bookings, sessions…)
│   └── functions/
│       └── send-notification/   # Edge function: push notification sender
├── schema.sql               # Legacy single-file schema (superseded by migrations/)
├── seed.sql                 # Legacy seed copy (superseded by supabase/seed.sql)
└── src/
    ├── components/          # Shared UI (AppModal, CertBadge, UserAvatar, SafetyBanner)
    ├── constants/theme.ts   # Colors, spacing, typography
    ├── hooks/               # useAppModal, …
    ├── lib/                 # supabase, googleAuth, location, notifications
    ├── navigation/          # Root navigator + role-based tab navigators
    ├── screens/             # 47 screens grouped by area (auth, profile, buddy, …)
    ├── store/authStore.ts   # Zustand auth/session state
    └── types/               # Hand-written app types (index.ts) + generated DB types
```

---

## 3. User Roles

| Role | Capabilities |
|---|---|
| **beginner** | Browse instructors, book lessons, message, view safety info |
| **certified** | Everything above + create/join open dive sessions, find buddies |
| **instructor** | Manage lesson types & availability, accept/decline bookings, get verified |
| **admin** | Review verifications, handle reports, manage users |

Role is stored on `buddyline.profiles.role` and drives which tab navigator loads
(`BeginnerTabs`, `CertifiedTabs`, `InstructorTabs`, `AdminTabs` under `src/navigation/`).

---

## 4. App Flow

### Authentication & onboarding
```
SplashScreen
  → (no session)  WelcomeScreen → SignUp / SignIn
                      → RoleSelectionScreen
                      → ProfileSetup (Beginner | Certified | Instructor)
                      → TermsOfServiceScreen  (records profiles.tos_accepted_at)
                      → SafetyScreen (first launch; AsyncStorage flag)
                      → role-based Tabs
  → (has session) role-based Tabs
```
- A Postgres trigger (`handle_new_user`) auto-creates a stub `profiles` row on signup.
- Deep links (`buddyline://`) handle email-confirmation and password-reset callbacks via the
  GitHub Pages HTML bridges and `App.tsx` link handling.

### Core loops
- **Lessons (beginner/certified → instructor):** instructor defines `lesson_types` and
  `availability_slots`; customer creates a `booking` (status `pending → confirmed → completed`).
  Bookings are realtime so both sides see status changes live.
- **Dive sessions (certified):** a diver creates an open `dive_sessions` row; others join via
  `dive_session_members` until `spots_needed` is filled. Realtime-enabled.
- **Messaging:** 1-to-1 `messages` between profiles, realtime subscription per conversation.
- **Verification:** certified divers/instructors submit credentials; admin sets
  `verification_status` (`pending → verified | rejected`, with `rejection_reason`).
- **Safety:** age-18 confirmation, ToS acceptance, in-app reporting (`reports`) and blocking
  (`blocks`).

---

## 5. Data Model (schema: `buddyline`)

### MVP (in active use)
`profiles`, `certified_profiles`, `instructor_profiles`, `lesson_types`, `availability_slots`,
`bookings`, `messages`, `reports`, `blocks`, `push_tokens`, `dive_sessions`,
`dive_session_members`.

### V2 stubs (schema ready, no UI yet)
`dive_requests` (legacy buddy requests — superseded by `dive_sessions`), `dive_logs`,
`sos_sessions` / `sos_watchers`, `group_dives` / `group_dive_members`, `ratings`, `dive_shops`,
and the marketplace tables (`marketplace_shops`, `marketplace_listings`, `marketplace_orders`,
`marketplace_reviews`).

**Conventions**
- Money stored as integer **cents** (e.g. `price_cents`) to avoid float rounding.
- Arrays (`text[]`) for disciplines/agencies/certs.
- **Row Level Security on every table** — users read/write only their own rows (policies in the
  migration). Realtime is enabled for `messages`, `bookings`, `sos_sessions`, `dive_sessions`,
  `dive_session_members`.

> ⚠️ Known cleanup item: the legacy person-to-person `dive_requests` model coexists with the
> newer open `dive_sessions` model. Consolidating them is tracked as a future refactor in
> [UPDATES.md](UPDATES.md).

### Storage buckets
`buddyline` bucket with folders: `avatars/`, `certs/`, `credentials/`, `marketplace/`,
`shop-logos/` — path-scoped to the owning user via Storage RLS.

---

## 6. Setup (local development)

1. **Install deps:** `npm install`
2. **Environment:** create `.env` (gitignored) in the project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://manwqkdbajvidgmtrvzy.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
   ```
3. **Database:** see [docs/WORKFLOW.md](docs/WORKFLOW.md). One-time link, then push migrations:
   ```
   npm run db:link      # supabase link --project-ref manwqkdbajvidgmtrvzy
   npm run db:push      # applies supabase/migrations/ to the cloud DB
   ```
   For a full local stack instead, `supabase start` applies migrations + `seed.sql` automatically.
4. **Run the app:** `npm run start` (Expo dev server), then open in Expo Go / a dev build.

---

## 7. Build & Release

- Profiles live in [eas.json](eas.json): `development`, `preview` (internal distribution),
  `production` (auto-increments version).
- Builds are run **manually**: `eas build --profile preview --platform android`.
- Automating builds on push (EAS Workflows) is documented as an **optional** future step in
  [docs/WORKFLOW.md](docs/WORKFLOW.md).

---

## 8. Key Files Reference

| Concern | File |
|---|---|
| Supabase client (schema, session) | [src/lib/supabase.ts](src/lib/supabase.ts) |
| Auth/session state | [src/store/authStore.ts](src/store/authStore.ts) |
| Navigation root | [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx) |
| App types / nav params | [src/types/index.ts](src/types/index.ts) |
| Theme | [src/constants/theme.ts](src/constants/theme.ts) |
| DB baseline | [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) |
| Push notifications (server) | [supabase/functions/send-notification/index.ts](supabase/functions/send-notification/index.ts) |
