-- ============================================================
-- Buddyline — PRODUCTION SEED (launch data only)
-- ============================================================
-- Real reference/launch data ONLY. Do NOT put fake test users here
-- (that's supabase/seed.sql, which is for local/dev via `db reset`).
--
-- NOT a migration — run manually after reset-production.sql.
--
-- Buddyline has almost no reference data, so this is mostly:
--   (1) promoting your first admin account, and
--   (2) optional real dive shops.
-- ============================================================

-- ------------------------------------------------------------
-- 1) ADMIN ACCOUNT
-- ------------------------------------------------------------
-- Recommended: create the admin like any normal user (sign up in the app
-- or via Dashboard → Authentication → Add user), THEN promote it here.
-- This avoids hand-crafting auth.users / auth.identities rows.
--
-- Replace the email below with your real admin email, then run:

update buddyline.profiles p
set role = 'admin',
    verification_status = 'verified',
    display_name = coalesce(p.display_name, 'Buddyline Admin'),
    age_confirmed = true,
    tos_accepted_at = coalesce(p.tos_accepted_at, now())
where p.id = (select id from auth.users where email = 'admin@buddyline.app');

-- Verify:
-- select id, role, display_name, verification_status
-- from buddyline.profiles where role = 'admin';

-- ------------------------------------------------------------
-- 2) DIVE SHOPS (optional real reference data)
-- ------------------------------------------------------------
-- Admin-populated locator. Add real shops here, or manage them later via
-- the Dashboard / a future admin screen. Template:
--
-- insert into buddyline.dive_shops
--   (name, address, city, country, latitude, longitude, phone, website, description, verified)
-- values
--   ('Example Freedive Center', '123 Beach Rd', 'Moalboal', 'Philippines',
--    9.9427, 123.3958, '+63...', 'https://example.com',
--    'AIDA & Molchanovs courses, equipment rental.', true)
-- on conflict do nothing;
