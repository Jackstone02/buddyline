-- ============================================================
-- Buddyline — PRODUCTION RESET (DESTRUCTIVE)
-- ============================================================
-- ⚠️  THIS DELETES ALL DATA: every row in the `buddyline` schema
--     AND every account in auth.users. Use only to clean the
--     project before launch.
--
-- This is NOT a migration — it lives outside supabase/migrations/
-- on purpose so it never runs during `db push` / `db reset`.
--
-- BEFORE RUNNING:
--   1. Back up first:  supabase db dump --data-only -f prod-backup.sql
--   2. Run this in the Supabase SQL Editor (or psql against the project).
--   3. After this, run seed-production.sql to add launch data.
--
-- Storage files (avatars, cert cards, credentials) are NOT removed
-- here — see the optional block at the bottom.
-- ============================================================

begin;

-- 1) Wipe all application data. Listing every table + CASCADE handles
--    FK order automatically and also clears admin-only tables (dive_shops)
--    that wouldn't be reached by cascading from auth.users.
truncate table
  buddyline.marketplace_reviews,
  buddyline.marketplace_orders,
  buddyline.marketplace_listings,
  buddyline.marketplace_shops,
  buddyline.ratings,
  buddyline.group_dive_members,
  buddyline.group_dives,
  buddyline.sos_watchers,
  buddyline.sos_sessions,
  buddyline.dive_logs,
  buddyline.dive_session_members,
  buddyline.dive_sessions,
  buddyline.dive_requests,
  buddyline.blocks,
  buddyline.push_tokens,
  buddyline.reports,
  buddyline.messages,
  buddyline.bookings,
  buddyline.availability_slots,
  buddyline.lesson_types,
  buddyline.instructor_profiles,
  buddyline.certified_profiles,
  buddyline.profiles,
  buddyline.dive_shops
  restart identity cascade;

-- 2) Remove all auth accounts. The handle_new_user trigger recreates a
--    profiles row on new signups, so profiles is intentionally cleared above.
delete from auth.users;

commit;

-- ============================================================
-- OPTIONAL — clear uploaded storage files too (run separately).
-- Adjust bucket ids to match your project (avatars, cert-cards,
-- credentials, buddyline).
-- ============================================================
-- delete from storage.objects
-- where bucket_id in ('avatars', 'cert-cards', 'credentials', 'buddyline');

-- Sanity check (should all return 0):
-- select 'profiles' t, count(*) from buddyline.profiles
-- union all select 'auth.users', count(*) from auth.users
-- union all select 'bookings', count(*) from buddyline.bookings;
