-- ============================================================
-- Buddyline — Seed / Mock Data
-- Schema: buddyline
--
-- HOW TO RUN:
-- 1. Paste into Supabase SQL Editor and run.
-- 2. Safe to re-run: cleans up existing seed data first.
--
-- SEED USERS (can sign in with these in Auth → Users):
--   admin@buddyline.app       / Test1234!
--   alex@buddyline.app        / Test1234!  (certified)
--   maria@buddyline.app       / Test1234!  (certified)
--   carlos@buddyline.app      / Test1234!  (instructor)
--   sofia@buddyline.app       / Test1234!  (instructor)
--   jake@buddyline.app        / Test1234!  (beginner)
--   luna@buddyline.app        / Test1234!  (beginner)
--
-- NOTE: These users must be created first in Auth → Users
-- (Dashboard or CLI), then run this file to seed their profiles.
-- The UUIDs below must match the Auth user IDs you create.
-- ============================================================

-- ============================================================
-- FIXED SEED UUIDs
-- Replace these with actual Auth user IDs if you create real
-- Auth users. OR run the DO block at the bottom that inserts
-- directly into auth.users (requires SQL editor / service role).
-- ============================================================

do $$
declare
  -- User IDs
  uid_admin    uuid := '10000000-0000-0000-0000-000000000001';
  uid_alex     uuid := '10000000-0000-0000-0000-000000000002';
  uid_maria    uuid := '10000000-0000-0000-0000-000000000003';
  uid_carlos   uuid := '10000000-0000-0000-0000-000000000004';
  uid_sofia    uuid := '10000000-0000-0000-0000-000000000005';
  uid_jake     uuid := '10000000-0000-0000-0000-000000000006';
  uid_luna     uuid := '10000000-0000-0000-0000-000000000007';

  -- Lesson type IDs
  lt_intro     uuid := '20000000-0000-0000-0000-000000000001';
  lt_aida2     uuid := '20000000-0000-0000-0000-000000000002';
  lt_pool      uuid := '20000000-0000-0000-0000-000000000003';
  lt_depth     uuid := '20000000-0000-0000-0000-000000000004';
  lt_ssi1      uuid := '20000000-0000-0000-0000-000000000005';
  lt_advanced  uuid := '20000000-0000-0000-0000-000000000006';

  -- Availability slot IDs
  slot_1 uuid := '30000000-0000-0000-0000-000000000001';
  slot_2 uuid := '30000000-0000-0000-0000-000000000002';
  slot_3 uuid := '30000000-0000-0000-0000-000000000003';
  slot_4 uuid := '30000000-0000-0000-0000-000000000004';
  slot_5 uuid := '30000000-0000-0000-0000-000000000005';
  slot_6 uuid := '30000000-0000-0000-0000-000000000006';
  slot_7 uuid := '30000000-0000-0000-0000-000000000007';
  slot_8 uuid := '30000000-0000-0000-0000-000000000008';

  -- Booking IDs
  bk_1 uuid := '40000000-0000-0000-0000-000000000001';
  bk_2 uuid := '40000000-0000-0000-0000-000000000002';
  bk_3 uuid := '40000000-0000-0000-0000-000000000003';
  bk_4 uuid := '40000000-0000-0000-0000-000000000004';

  -- Dive request IDs
  dr_1 uuid := '50000000-0000-0000-0000-000000000001';
  dr_2 uuid := '50000000-0000-0000-0000-000000000002';
  dr_3 uuid := '50000000-0000-0000-0000-000000000003';

  -- Dive session IDs
  ds_1 uuid := '60000000-0000-0000-0000-000000000001';
  ds_2 uuid := '60000000-0000-0000-0000-000000000002';
  ds_3 uuid := '60000000-0000-0000-0000-000000000003';

  -- Message IDs
  msg_1  uuid := '70000000-0000-0000-0000-000000000001';
  msg_2  uuid := '70000000-0000-0000-0000-000000000002';
  msg_3  uuid := '70000000-0000-0000-0000-000000000003';
  msg_4  uuid := '70000000-0000-0000-0000-000000000004';
  msg_5  uuid := '70000000-0000-0000-0000-000000000005';
  msg_6  uuid := '70000000-0000-0000-0000-000000000006';
  msg_7  uuid := '70000000-0000-0000-0000-000000000007';
  msg_8  uuid := '70000000-0000-0000-0000-000000000008';
  msg_9  uuid := '70000000-0000-0000-0000-000000000009';
  msg_10 uuid := '70000000-0000-0000-0000-000000000010';

  -- Report IDs
  rep_1 uuid := '80000000-0000-0000-0000-000000000001';

begin

  -- ============================================================
  -- STEP 1 — Auth users + identities
  -- Supabase requires BOTH auth.users AND auth.identities for
  -- email/password login to work. Missing identities = login fails.
  -- ============================================================

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    -- Required empty strings (GoTrue won't auth without these columns present)
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new
  ) values
    ('00000000-0000-0000-0000-000000000000', uid_admin,  'authenticated', 'authenticated', 'admin@buddyline.app',  crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Buddyline Admin"}'::jsonb,  false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_alex,   'authenticated', 'authenticated', 'alex@buddyline.app',   crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Alex Reyes"}'::jsonb,       false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_maria,  'authenticated', 'authenticated', 'maria@buddyline.app',  crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Maria Santos"}'::jsonb,     false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_carlos, 'authenticated', 'authenticated', 'carlos@buddyline.app', crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Carlos Mendez"}'::jsonb,    false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_sofia,  'authenticated', 'authenticated', 'sofia@buddyline.app',  crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Sofia Lee"}'::jsonb,        false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_jake,   'authenticated', 'authenticated', 'jake@buddyline.app',   crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Jake Cruz"}'::jsonb,        false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', uid_luna,   'authenticated', 'authenticated', 'luna@buddyline.app',   crypt('Test1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Luna Park"}'::jsonb,        false, now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- auth.identities — required for email/password sign-in
  -- Without this table GoTrue has no way to look up the user by email.
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values
    (uid_admin::text,  uid_admin,  jsonb_build_object('sub', uid_admin::text,  'email', 'admin@buddyline.app'),  'email', now(), now(), now()),
    (uid_alex::text,   uid_alex,   jsonb_build_object('sub', uid_alex::text,   'email', 'alex@buddyline.app'),   'email', now(), now(), now()),
    (uid_maria::text,  uid_maria,  jsonb_build_object('sub', uid_maria::text,  'email', 'maria@buddyline.app'),  'email', now(), now(), now()),
    (uid_carlos::text, uid_carlos, jsonb_build_object('sub', uid_carlos::text, 'email', 'carlos@buddyline.app'), 'email', now(), now(), now()),
    (uid_sofia::text,  uid_sofia,  jsonb_build_object('sub', uid_sofia::text,  'email', 'sofia@buddyline.app'),  'email', now(), now(), now()),
    (uid_jake::text,   uid_jake,   jsonb_build_object('sub', uid_jake::text,   'email', 'jake@buddyline.app'),   'email', now(), now(), now()),
    (uid_luna::text,   uid_luna,   jsonb_build_object('sub', uid_luna::text,   'email', 'luna@buddyline.app'),   'email', now(), now(), now())
  on conflict (id, provider) do nothing;

  -- ============================================================
  -- STEP 2 — profiles
  -- ============================================================

  insert into buddyline.profiles
    (id, role, display_name, city_region, bio, age_confirmed, tos_accepted_at,
     verification_status, available_to_dive, latitude, longitude, created_at)
  values
    -- Admin
    (uid_admin,  'admin',      'Buddyline Admin', 'Cebu City, Philippines',
     'Platform administrator.',
     true, now(), 'verified', false, 10.3157, 123.8854, now() - interval '60 days'),

    -- Certified divers
    (uid_alex,   'certified',  'Alex Reyes',  'Moalboal, Cebu',
     'AIDA 3 freediver. Mostly line training and deep dives. Been diving since 2019. Always looking for a consistent morning buddy.',
     true, now(), 'verified', true, 9.9427, 123.3958, now() - interval '30 days'),

    (uid_maria,  'certified',  'Maria Santos', 'Panglao, Bohol',
     'SSI Level 2 diver. Love fun dives and underwater photography. Super safety-conscious — always do full protocols.',
     true, now(), 'verified', true, 9.5831, 123.7446, now() - interval '20 days'),

    -- Instructors
    (uid_carlos, 'instructor', 'Carlos Mendez', 'Moalboal, Cebu',
     'AIDA and SSI Instructor with 8 years teaching experience. Specializing in performance freediving and beginner courses. Small group sizes only.',
     true, now(), 'verified', false, 9.9440, 123.3970, now() - interval '45 days'),

    (uid_sofia,  'instructor', 'Sofia Lee',  'Dauin, Negros Oriental',
     'Molchanovs Wave 3 Instructor. Trained in South Korea and the Philippines. Focus on relaxation techniques and breath-hold training.',
     true, now(), 'verified', false, 9.1986, 123.1798, now() - interval '15 days'),

    -- Beginners
    (uid_jake,   'beginner',   'Jake Cruz',   'Cebu City, Philippines',
     'Just got into freediving! Looking to book my first course.',
     true, now(), 'none',     false, 10.3157, 123.8854, now() - interval '5 days'),

    (uid_luna,   'beginner',   'Luna Park',   'Mactan, Cebu',
     'Recreational scuba diver curious about freediving.',
     true, now(), 'none',     false, 10.2931, 123.9779, now() - interval '2 days')
  on conflict (id) do update set
    role                = excluded.role,
    display_name        = excluded.display_name,
    city_region         = excluded.city_region,
    bio                 = excluded.bio,
    age_confirmed       = excluded.age_confirmed,
    tos_accepted_at     = excluded.tos_accepted_at,
    verification_status = excluded.verification_status,
    available_to_dive   = excluded.available_to_dive,
    latitude            = excluded.latitude,
    longitude           = excluded.longitude;

  -- ============================================================
  -- STEP 3 — certified_profiles
  -- ============================================================

  insert into buddyline.certified_profiles
    (id, cert_level, agency, years_experience, max_depth_m, disciplines, cert_card_url)
  values
    (uid_alex,  'AIDA 3', 'AIDA', 5, 38,
     array['depth','line_training','dynamic'],
     'https://placehold.co/400x250/0B3C5D/white?text=Alex+AIDA3'),

    (uid_maria, 'SSI Level 2', 'SSI', 3, 25,
     array['fun_dive','static','pool'],
     'https://placehold.co/400x250/1CA7A6/white?text=Maria+SSI2')
  on conflict (id) do update set
    cert_level       = excluded.cert_level,
    agency           = excluded.agency,
    years_experience = excluded.years_experience,
    max_depth_m      = excluded.max_depth_m,
    disciplines      = excluded.disciplines,
    cert_card_url    = excluded.cert_card_url;

  -- ============================================================
  -- STEP 4 — instructor_profiles
  -- ============================================================

  insert into buddyline.instructor_profiles
    (id, teaching_location, agencies, certs_offered, years_teaching, credentials_url)
  values
    (uid_carlos, 'Moalboal, Cebu',
     array['AIDA','SSI'],
     array['AIDA Instructor','SSI Instructor'],
     8,
     'https://placehold.co/400x250/0B3C5D/white?text=Carlos+Credentials'),

    (uid_sofia, 'Dauin, Negros Oriental',
     array['Molchanovs'],
     array['Molchanovs Instructor'],
     4,
     'https://placehold.co/400x250/1CA7A6/white?text=Sofia+Credentials')
  on conflict (id) do update set
    teaching_location = excluded.teaching_location,
    agencies          = excluded.agencies,
    certs_offered     = excluded.certs_offered,
    years_teaching    = excluded.years_teaching,
    credentials_url   = excluded.credentials_url;

  -- ============================================================
  -- STEP 5 — lesson_types
  -- ============================================================

  delete from buddyline.lesson_types
  where id in (lt_intro, lt_aida2, lt_pool, lt_depth, lt_ssi1, lt_advanced);

  insert into buddyline.lesson_types
    (id, instructor_id, name, duration_minutes, skill_level, session_format, price, max_participants)
  values
    -- Carlos Mendez courses
    (lt_intro,  uid_carlos, 'Intro to Freediving',        120, 'beginner',     'open_water', 2500, 4),
    (lt_aida2,  uid_carlos, 'AIDA 2 Course',              480, 'beginner',     'open_water', 8000, 3),
    (lt_pool,   uid_carlos, 'Pool Technique Session',      90, 'intermediate', 'pool',       1500, 2),
    (lt_depth,  uid_carlos, 'Deep Dive Training (20–30m)', 180, 'intermediate', 'open_water', 3500, 2),

    -- Sofia Lee courses
    (lt_ssi1,    uid_sofia, 'SSI Level 1 Freediver',      360, 'beginner',     'open_water', 7500, 4),
    (lt_advanced,uid_sofia, 'Molchanovs Wave 2 Course',   480, 'advanced',     'open_water',12000, 2);

  -- ============================================================
  -- STEP 6 — availability_slots
  -- ============================================================

  delete from buddyline.availability_slots
  where id in (slot_1,slot_2,slot_3,slot_4,slot_5,slot_6,slot_7,slot_8);

  insert into buddyline.availability_slots
    (id, instructor_id, slot_date, start_time, end_time, is_booked)
  values
    -- Carlos — next 4 days
    (slot_1, uid_carlos, current_date + 1, '07:00', '10:00', false),
    (slot_2, uid_carlos, current_date + 1, '13:00', '16:00', true),   -- booked
    (slot_3, uid_carlos, current_date + 2, '07:00', '10:00', false),
    (slot_4, uid_carlos, current_date + 3, '07:00', '10:00', false),

    -- Sofia — next 4 days
    (slot_5, uid_sofia,  current_date + 1, '08:00', '12:00', false),
    (slot_6, uid_sofia,  current_date + 2, '08:00', '12:00', true),   -- booked
    (slot_7, uid_sofia,  current_date + 3, '08:00', '12:00', false),
    (slot_8, uid_sofia,  current_date + 4, '14:00', '18:00', false);

  -- ============================================================
  -- STEP 7 — bookings
  -- ============================================================

  delete from buddyline.bookings
  where id in (bk_1, bk_2, bk_3, bk_4);

  insert into buddyline.bookings
    (id, customer_id, instructor_id, lesson_type_id, availability_slot_id,
     booking_date, start_time, participants_count, notes, status, created_at)
  values
    -- Jake books Carlos (pending)
    (bk_1, uid_jake, uid_carlos, lt_intro, slot_2,
     current_date + 1, '13:00', 1,
     'Super excited for my first session! Is there anything I should bring?',
     'pending', now() - interval '1 day'),

    -- Luna books Carlos (confirmed)
    (bk_2, uid_luna, uid_carlos, lt_aida2, null,
     current_date + 3, '07:00', 1,
     'I have some scuba experience. Looking forward to learning breath-hold.',
     'confirmed', now() - interval '3 days'),

    -- Jake books Sofia (pending)
    (bk_3, uid_jake, uid_sofia, lt_ssi1, slot_6,
     current_date + 2, '08:00', 1,
     null,
     'pending', now() - interval '2 hours'),

    -- Alex books Sofia — completed past session
    (bk_4, uid_alex, uid_sofia, lt_advanced, null,
     current_date - 5, '08:00', 1,
     'Looking to push past 30m.',
     'completed', now() - interval '10 days');

  -- ============================================================
  -- STEP 8 — dive_requests (certified ↔ certified)
  -- ============================================================

  delete from buddyline.dive_requests
  where id in (dr_1, dr_2, dr_3);

  insert into buddyline.dive_requests
    (id, requester_id, buddy_id, requested_date, location_name,
     disciplines, notes, status, created_at)
  values
    -- Alex requests Maria (pending)
    (dr_1, uid_alex, uid_maria,
     current_date + 2,
     'Pescador Island, Moalboal',
     array['line_training','depth'],
     'Planning a morning session targeting 30–35m. Safety protocols mandatory. 2-hour session.',
     'pending', now() - interval '4 hours'),

    -- Maria requests Alex (accepted)
    (dr_2, uid_maria, uid_alex,
     current_date + 1,
     'Panagsama Beach, Moalboal',
     array['fun_dive'],
     'Sunset fun dive. Bringing camera. Just looking for a safety buddy.',
     'accepted', now() - interval '2 days'),

    -- Alex requests Maria (cancelled — old)
    (dr_3, uid_alex, uid_maria,
     current_date - 3,
     'Tañon Strait',
     array['dynamic'],
     'Pool day at the resort.',
     'cancelled', now() - interval '7 days');

  -- ============================================================
  -- STEP 9 — dive_sessions (open sessions on home screen)
  -- ============================================================

  delete from buddyline.dive_session_members
  where session_id in (ds_1, ds_2, ds_3);

  delete from buddyline.dive_sessions
  where id in (ds_1, ds_2, ds_3);

  insert into buddyline.dive_sessions
    (id, creator_id, location_name, latitude, longitude,
     scheduled_at, max_depth_m, dive_type, spots_needed, notes, status, created_at)
  values
    -- Alex's session — today, open
    (ds_1, uid_alex,
     'Pescador Island, Moalboal',
     9.9301, 123.3761,
     (current_date + 1 + time '07:00')::timestamptz,
     35, 'line_training', 1,
     'Targeting 30–35m. Looking for one AIDA 2+ buddy. Full safety protocols. Bring lanyard.',
     'open', now() - interval '2 hours'),

    -- Maria's session — tomorrow, open
    (ds_2, uid_maria,
     'Alona Beach, Panglao',
     9.5469, 123.7539,
     (current_date + 2 + time '06:30')::timestamptz,
     20, 'fun_dive', 2,
     'Sunrise fun dive. Good visibility lately. Any cert level welcome!',
     'open', now() - interval '5 hours'),

    -- Alex's session — in 3 days, open
    (ds_3, uid_alex,
     'Tañon Strait, Moalboal',
     9.9760, 123.3510,
     (current_date + 3 + time '16:00')::timestamptz,
     28, 'spearfishing', 1,
     'Afternoon spearfishing run. Need one buddy with spearfishing experience.',
     'open', now() - interval '1 hour');

  -- Session members — Maria joined Alex's first session
  insert into buddyline.dive_session_members (session_id, user_id, joined_at)
  values (ds_1, uid_maria, now() - interval '1 hour')
  on conflict do nothing;

  -- ============================================================
  -- STEP 10 — messages
  -- ============================================================

  delete from buddyline.messages
  where id in (msg_1,msg_2,msg_3,msg_4,msg_5,msg_6,msg_7,msg_8,msg_9,msg_10);

  insert into buddyline.messages
    (id, sender_id, receiver_id, content, is_read, created_at)
  values
    -- Alex ↔ Maria conversation (dive planning)
    (msg_1,  uid_alex,  uid_maria,
     'Hey Maria! Your profile looks great. I saw you''re also at Moalboal sometimes — want to dive together this weekend?',
     true,  now() - interval '3 days'),
    (msg_2,  uid_maria, uid_alex,
     'Hey Alex! Yes definitely. I''m free Saturday morning. Pescador?',
     true,  now() - interval '3 days' + interval '10 minutes'),
    (msg_3,  uid_alex,  uid_maria,
     'Perfect. 7am? I''ll bring the anchor buoy.',
     true,  now() - interval '3 days' + interval '20 minutes'),
    (msg_4,  uid_maria, uid_alex,
     'See you there! I''ll do the full safety check on the beach before we start.',
     true,  now() - interval '3 days' + interval '30 minutes'),
    (msg_5,  uid_alex,  uid_maria,
     'Great. Also sent you a dive request for the Tañon session next week 👍',
     false, now() - interval '4 hours'),

    -- Jake ↔ Carlos conversation (booking follow-up)
    (msg_6,  uid_jake,  uid_carlos,
     'Hi Carlos! I just booked your Intro session for tomorrow. Super excited!',
     true,  now() - interval '1 day'),
    (msg_7,  uid_carlos, uid_jake,
     'Welcome Jake! Bring a rashguard and fins if you have them. We''ll provide everything else. Meet at Panagsama Beach at 1pm.',
     true,  now() - interval '1 day' + interval '15 minutes'),
    (msg_8,  uid_jake,  uid_carlos,
     'Got it! I don''t have fins yet — will the ones you provide fit size 42?',
     true,  now() - interval '23 hours'),
    (msg_9,  uid_carlos, uid_jake,
     'Yes we have all sizes. No problem!',
     false, now() - interval '22 hours'),

    -- Alex ↔ Sofia (post-session)
    (msg_10, uid_sofia,  uid_alex,
     'Great session last week Alex! Your breath-hold has improved a lot. Ready to push 35m next time?',
     false, now() - interval '4 days');

  -- ============================================================
  -- STEP 11 — reports
  -- ============================================================

  delete from buddyline.reports where id = rep_1;

  insert into buddyline.reports
    (id, reporter_id, reported_id, reason, details, status, created_at)
  values
    (rep_1, uid_alex, uid_jake,
     'Inappropriate behavior',
     'This user sent repeated unsolicited messages after I asked them to stop.',
     'open', now() - interval '1 day');

  raise notice 'Seed complete. 7 users, 6 lesson types, 8 slots, 4 bookings, 3 dive requests, 3 sessions, 10 messages, 1 report.';

end $$;
