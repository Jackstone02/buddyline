# Buddyline 🤿

> **Never Dive Alone** — A safety-focused freediving community app for connecting certified divers and finding qualified instructors.

[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)](https://expo.dev)
[![Framework](https://img.shields.io/badge/framework-React%20Native%20%2B%20Expo-61DAFB)](https://expo.dev)
[![Backend](https://img.shields.io/badge/backend-Supabase-3ECF8E)](https://supabase.com)
[![Language](https://img.shields.io/badge/language-TypeScript-3178C6)](https://typescriptlang.org)

---

## About

Buddyline is a mobile app that puts safety first for the freediving community. It connects:

- **Certified freedivers** with verified dive buddies — so no one dives alone
- **All divers** with verified instructors — for training, guidance, and coaching
- **Instructors** with prospective students — via a dedicated, verified profile

> ⚠️ Buddyline connects people only — it does not supervise dives. Always dive within your training limits.

---

## Features

### For All Users
- Browse and search verified freediving instructors
- Message instructors directly
- View instructor profiles with credentials, agencies, and teaching location

### For Certified Freedivers (verified)
- Toggle availability to dive and appear in the buddy feed
- Search for available dive buddies by city, cert level, and discipline
- Send and receive dive requests with date, location, and discipline details
- Accept, decline, or cancel dive requests
- Message dive buddies

### For Freediving Instructors (verified)
- Dedicated instructor dashboard
- Appear in the instructor search directory
- Manage inquiry messages

### Safety
- Mandatory safety acknowledgement screen on first launch
- Safety reminder banner in every message thread
- Age 18+ verification at signup
- User reporting and blocking system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript |
| Backend | Supabase (Auth + PostgreSQL + Storage + Realtime) |
| State | Zustand v5 |
| Navigation | React Navigation v6 |
| Icons | Expo Vector Icons (Ionicons) |
| Images | expo-image-picker |
| Storage | AsyncStorage (safety flag persistence) |

---

## User Roles

| Feature | Beginner | Certified (verified) | Instructor (verified) |
|---|---|---|---|
| Browse instructors | ✅ | ✅ | ✅ |
| Message instructors | ✅ | ✅ | ✅ |
| Find dive buddy | ❌ | ✅ | ✅ |
| Send dive requests | ❌ | ✅ | ✅ |
| Appear in buddy search | ❌ | ✅ | ❌ |
| Appear in instructor search | ❌ | ❌ | ✅ |

---

## Project Structure

```
buddyline/
├── App.tsx                         # Entry point + deep link handling
├── app.config.js                   # Expo config (name, slug, scheme)
├── src/
│   ├── constants/
│   │   └── theme.ts                # Colors, spacing, typography
│   ├── types/
│   │   └── index.ts                # TypeScript types + nav param lists
│   ├── lib/
│   │   └── supabase.ts             # Supabase client
│   ├── store/
│   │   └── authStore.ts            # Zustand auth store
│   ├── hooks/
│   │   └── useAppModal.ts          # Reusable modal hook
│   ├── components/
│   │   ├── AppModal.tsx            # Reusable modal component
│   │   ├── CertBadge.tsx           # Verification badge
│   │   └── SafetyBanner.tsx        # Safety reminder strip
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Root stack navigator
│   │   ├── BeginnerTabs.tsx        # Tab nav for beginners
│   │   ├── CertifiedTabs.tsx       # Tab nav for certified divers
│   │   └── InstructorTabs.tsx      # Tab nav for instructors
│   └── screens/
│       ├── auth/                   # Splash, Welcome, SignIn, SignUp, Onboarding
│       ├── profile/                # Role selection, setup, verification pending
│       ├── shared/                 # Safety, Messages, Settings
│       ├── instructor/             # Find, Profile, Dashboard
│       └── buddy/                  # Home, Find, Profile, Dive Requests
├── index.html                      # GitHub Pages landing page
├── email-confirmation.html         # Email confirmation deep link bridge
├── password-reset.html             # Password reset deep link bridge
├── privacy-policy.html             # Privacy policy
└── delete-account.html             # Account deletion instructions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo`
- iOS Simulator (Mac) or Android Emulator, or Expo Go app

### Installation

```bash
# Clone the repo
git clone https://github.com/jackstone02/buddyline.git
cd buddyline

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### Environment Variables

Create a `.env` file in the root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run the App

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

---

## Supabase Setup

### Schema (versioned migrations)

The database is managed with the **Supabase CLI** — no more pasting SQL into the dashboard.
Migrations live in [supabase/migrations/](supabase/migrations/) and are applied automatically:

```bash
npm run db:link        # one time: link to project ref manwqkdbajvidgmtrvzy
npm run db:push:dry    # preview what will run
npm run db:push        # apply migrations to the cloud DB (idempotent + non-destructive)
```

Make schema changes with `npm run db:new <name>` → edit the file → `npm run db:push`.
Full guide: [docs/WORKFLOW.md](docs/WORKFLOW.md). The legacy `schema.sql` is superseded by
[supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql).

### Required Configuration

1. **Exposed Schemas** — In Supabase → Settings → API → Exposed Schemas, add `buddyline`
2. **Auth Redirect URLs** — Add `https://jackstone02.github.io/buddyline/email-confirmation` as an allowed redirect URL
3. **Site URL** — Set to `https://jackstone02.github.io/buddyline/email-confirmation`
4. **Storage Buckets** — Create: `avatars`, `cert-cards`, `credentials`

### Tables

| Table | Purpose |
|---|---|
| `buddyline.profiles` | Core user profiles (all roles) |
| `buddyline.certified_profiles` | Extra data for certified divers |
| `buddyline.instructor_profiles` | Extra data for instructors |
| `buddyline.dive_requests` | Dive request bookings between certified divers |
| `buddyline.messages` | 1-on-1 direct messages |
| `buddyline.reports` | User safety reports |
| `buddyline.blocks` | User block relationships |

---

## Deep Linking

The app uses the `buddyline://` URL scheme for deep links.

| Deep Link | Purpose |
|---|---|
| `buddyline://` | Open app home |
| `buddyline://email-confirmed?accessToken=...` | Post email confirmation |
| `buddyline://reset-password?accessToken=...&refreshToken=...` | Password reset |

GitHub Pages bridges (`email-confirmation.html`, `password-reset.html`) extract tokens from Supabase redirect URLs and forward them to the app via deep links.

---

## Verification Flow

1. User signs up as Certified or Instructor and uploads credential images
2. Profile `verification_status` is set to `pending`
3. Admin reviews and sets `verification_status` to `verified` in Supabase dashboard
4. User is routed to the appropriate tab navigator with full feature access

Unverified certified/instructor users see the `VerificationPending` screen until approved.

---

## Safety Policy

Buddyline enforces a strict safety-first policy:

- Users must be 18+ (confirmed at signup, stored as `age_confirmed`)
- A mandatory safety acknowledgement screen must be accepted before accessing any features (stored in AsyncStorage as `@buddyline:safetyAccepted`)
- Every message thread displays a safety reminder banner
- All discovery screens include a footer: "This app connects people only — it does not supervise dives"
- Users can report or block other users at any time

---

## Troubleshooting

### "Email not confirmed" error on sign in
Email confirmation is required. Check your email for the confirmation link. Ensure the Supabase Site URL and Redirect URLs point to `https://jackstone02.github.io/buddyline/email-confirmation`.

### App routes to wrong screen after signup
Check that `buddyline` is listed in Supabase → Settings → API → Exposed Schemas. Without this, profile queries fail silently and the app falls back to onboarding.

### Deep links not working
Ensure `buddyline` scheme is registered in `app.config.js` under `scheme`. On iOS, also check the associated domains configuration.

### Supabase FK alias error on dive requests
Use explicit FK aliases when querying multiple joins to the same table:
```javascript
.select(`*, requester:profiles!dive_requests_requester_id_fkey(*), buddy:profiles!dive_requests_buddy_id_fkey(*)`)
```

---

## Contributing

This is a private project. For bug reports or feature requests, open an issue on GitHub.

---

## License

Private — all rights reserved.

---

*Buddyline — Never Dive Alone*
