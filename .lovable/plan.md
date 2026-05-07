
# EPIC RDC Reporting Platform — Full MVP Plan

A bilingual (FR/EN) multi-user web platform for monthly health program reporting across 9 DRC provinces. Uses Lovable Cloud (Supabase) for auth, database, and RLS. TanStack Start for routes and server functions.

---

## Phase 1 — Auth, DB schema, seed data

### Database (migration)

Enums:
- `app_role`: `province_user`, `technical_director`, `read_only`
- `report_status`: `draft`, `submitted`, `validated`
- `narrative_section`: `stakeholder_coordination`, `success_stories`, `challenges`, `priorities_next_month`, `exec_summary_smni`, `exec_summary_nutrition`, `exec_summary_malaria`

Tables:
- `provinces` (id, name, code)
- `profiles` (id → auth.users, full_name, email, province_id)
- `user_roles` (id, user_id, role, province_id) — separate table per security rules; `has_role()` SECURITY DEFINER function
- `reports` (id, province_id, month, year, status, submitted_at, validated_at, validated_by, created_by) — UNIQUE (province_id, month, year)
- `activities` (id, report_id, objective [1/2/3], activity_code, description, planned, achieved, percentage)
- `narratives` (id, report_id, section_type, content)
- `report_drafts` (id, report_id, payload jsonb, updated_at) — for autosave snapshots

RLS policies (using `has_role()`):
- province users: full CRUD on own province's `draft` reports; read all reports
- technical_director: read all, update status to `validated`
- read_only: SELECT all
- All authenticated users can read provinces and profiles

Trigger: auto-create profile row on `auth.users` insert.

### Seed data
- 9 DRC provinces (Kinshasa, Kongo Central, Kwango, Kwilu, Mai-Ndombe, Kasaï, Kasaï Central, Lualaba, Haut-Katanga — confirm at build)
- Demo accounts (created via Cloud admin): 1 director, 2 province users, 1 read-only viewer; all with password `Demo1234!`

### Auth
- Lovable Cloud email/password (no email confirmation for demo)
- `_authenticated` layout route + `beforeLoad` redirect to `/login`
- Login + signup pages (signup hidden; admin creates users)
- Auth context exposes `role` and `provinceId`

---

## Phase 2 — Reporting forms

Route `/_authenticated/reports/$reportId/edit` with section tabs:
- A: Activity table (rows of activity_code, planned, achieved → auto % via input)
- B: Objectives 1–3 (repeatable activity rows per objective)
- C–F: Rich text narratives (textarea with markdown preview)
- G: Executive summary (3 sub-fields: SMNI, Nutrition, Malaria)

Form state managed with react-hook-form + zod. Single "save draft" payload writes to `report_drafts` then commits to relational tables on submit.

Autosave: `setInterval(30s)` calls server fn `saveDraft({reportId, payload})`. Manual "Save" button. Restore-on-load reads latest draft snapshot.

---

## Phase 3 — Submission workflow

- "Submit" button transitions `draft → submitted`, sets `submitted_at`
- Submitted reports: editable only while not validated (province user)
- Director "Validate" action → `validated`, `validated_at`, `validated_by`
- Status badges (Draft / Submitted / Validated) visible everywhere
- New report creation: `/_authenticated/reports/new` picks month + year (defaults to current); enforced uniqueness per province/month/year

---

## Phase 4 — Dashboards

`/_authenticated/dashboard` (role-aware):

Director view:
- KPI cards: total submissions this month, % provinces submitted, % validated
- Submission status grid: 9 provinces × current month (Draft/Submitted/Validated/Missing)
- Monthly trend chart (recharts): submissions per month (last 12 months)
- Activity completion % across provinces

Province view:
- Own submission history (last 12 months)
- Read-only list of other provinces' latest reports
- Upcoming deadline reminder

Read-only view: same as director without action buttons.

---

## Phase 5 — Consolidation engine

`/_authenticated/consolidation` (director + read-only):
- Filters: month, year, province (multi), health domain
- Aggregated activity table (sum planned/achieved across selected provinces, weighted %)
- Concatenated narratives grouped by section + province
- Live updates as filters change (server fn returns aggregated payload)

---

## Phase 6 — Export (PDF)

- Use `jspdf` + `jspdf-autotable` (Worker-compatible, pure JS)
- Server fn `generateConsolidatedPdf({month, year, provinceIds})` returns base64 PDF
- Client downloads via blob
- PDF contents: cover page, exec summary, consolidated activity table, narrative sections, charts as images (rendered client-side then re-embedded), metadata footer
- DOCX deferred (post-MVP)

---

## Phase 7 — Polish & responsiveness

- Bilingual i18n: lightweight custom `useT()` hook + JSON dictionaries (`fr.json`, `en.json`); FR default. Toggle in header, persisted to localStorage.
- Mobile-first layout: collapsible sidebar, bottom nav on mobile, large tap targets
- Optimized for 3G: lazy-load consolidation/export routes, no heavy assets
- Empty states, loading skeletons, toast notifications (sonner)
- Error boundaries on all routes with loaders

---

## Route map

```
/                             → redirect (auth → /dashboard, else → /login)
/login
/_authenticated/dashboard
/_authenticated/reports                      (list)
/_authenticated/reports/new
/_authenticated/reports/$reportId            (read-only view)
/_authenticated/reports/$reportId/edit
/_authenticated/consolidation                (director + read_only)
/_authenticated/history                      (archive by month/year/province)
```

## Tech notes

- Cloud (Supabase) enabled; all DB access via `createServerFn` + `requireSupabaseAuth`
- Roles via separate `user_roles` table + `has_role()` SECURITY DEFINER (no role on profiles)
- Recharts for charts; shadcn/ui for components
- jsPDF for export (Worker-compatible)

## Out of scope (per PRD)

Offline sync, notifications, AI analytics, mobile app, advanced workflows, audit logs, DOCX export (optional/deferred).

## Demo credentials (after build)

- Director: `director@epic.cd` / `Demo1234!`
- Province (Kinshasa): `kinshasa@epic.cd` / `Demo1234!`
- Province (Lualaba): `lualaba@epic.cd` / `Demo1234!`
- Read-only: `viewer@epic.cd` / `Demo1234!`
