# Mentorship System — TODO & Quick Handoff

This is a concise, prioritized checklist to continue work on the Alumni Mentorship features across schema, RLS, and app flows. Use this to resume on any machine.

## Immediate next steps

1) Run these SQL scripts in Supabase (safe to run multiple times):
- CHECK_AND_FIX_MENTORSHIP_SCHEMA.sql — ensures tables/columns/triggers/indexes exist
- ADD_MENTOR_EMAIL_LOWER_POLICIES.sql — lowercase-safe mentor dashboard policies + indexes
- FIX_ADMIN_ACCESS_EDUCATION.sql — verify/enable admin access and products_services policies

2) Re-test key screens
- Education → Schools & Scholarships visible for admins (no auto-redirect)
- Admin Alumni Mentors panel opens for admins after profile loads
- Mentor dashboard loads only for approved mentors

## Checklist (WIP)

- [ ] Audit and fix RLS
  - Public: SELECT approved mentors
  - Admins: full CRUD on mentors/applications/requests
  - Mentors: view/update their own requests (email match via lower(email))
  - Users: view their own mentor_requests
- [ ] Unify admin detection across app
  - profiles.is_admin = true OR role IN ('admin','staff')
  - Wait for profile to load before checking
- [ ] Fix mentor existence check
  - Replace .single() with .maybeSingle() where 0 rows is expected (avoid 406/PGRST116)
  - Handle null gracefully in UI
- [ ] Harden access guards & states
  - Loading/empty/error paths for Education, Admin panel, Mentor dashboard
  - Clear deny messages; no stuck spinners
- [ ] Canonicalize emails
  - Store/compare lowercase emails in SQL and app
  - Migrate existing rows to lower(email)
  - Unique index on lower(email) where appropriate
- [ ] Public mentors listing polish
  - Fetch only status='approved'; paginate/limit; expertise chips; image fallbacks
- [ ] Volunteer application flow
  - Validate form → insert into mentor_applications; admin review; dedupe by email; throttle spam
- [ ] Mentor profile + request
  - Display details; submit mentor_requests; prevent duplicates by same mentee+mentor; success UX
- [ ] Mentor dashboard actions
  - List pending/accepted/all; accept/decline; mark completed; show mentee contact after acceptance
- [ ] Admin mentors panel CRUD
  - Approve application creates mentor row; change status; delete mentor (CASCADE on requests); add new mentor form
- [ ] Indexes and performance
  - Verify: mentors(status, lower(email)), requests(mentor_id,status,mentee_id), applications(status,user_id)
- [ ] Consistent types
  - Centralize TS types for DB rows; align select() columns; avoid any[]
- [ ] Telemetry, logs, and tests
  - Structured logs with tags; sanitize PII; unit/integration tests for accept/decline and admin approval
- [ ] Docs/runbook
  - Short README: schema, policies, admin/mentor promotion, common errors (406, RLS)

## Reference files in repo

- CREATE_ALUMNI_MENTORS_SYSTEM.sql — original end-to-end schema + policies + seed
- ADD_MENTOR_DASHBOARD_POLICIES.sql — mentor request access (email match; superseded by lowercase-safe variant)
- CHECK_AND_FIX_MENTORSHIP_SCHEMA.sql — idempotent schema fix/verify
- ADD_MENTOR_EMAIL_LOWER_POLICIES.sql — lowercase-safe mentor policies
- FIX_ADMIN_ACCESS_EDUCATION.sql — admin verification + products_services checks

## How to resume

- Run the three SQL scripts above in Supabase.
- In the app, sign in as an admin and confirm Education and Admin panels are accessible.
- Continue with the RLS audit and UI guard/states. When changing mentor lookups, switch to .maybeSingle() and handle null.

---
Owner: Akora mentorship revamp
Branch: main
