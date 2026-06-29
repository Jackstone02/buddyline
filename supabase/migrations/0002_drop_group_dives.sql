-- ============================================================
-- 0002 — Drop redundant group-dive stub tables
-- ============================================================
-- `group_dives` / `group_dive_members` were V2 stubs that are fully covered by
-- `dive_sessions`: a dive session with spots_needed > 1 already lets multiple
-- people join (capacity enforced, auto-"full", dive_session_members). No app
-- code references these tables and they hold no data.
--
-- Drop the child table first (FK to group_dives), then the parent.
-- ============================================================

drop table if exists buddyline.group_dive_members;
drop table if exists buddyline.group_dives;
