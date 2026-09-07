# Seminary Management System

A modernization of an AppSheet school/seminary management system:
**one PostgreSQL database, one REST API, three separate websites — each with
its own name and its own logins.**

| Website | URL | Purpose |
| --- | --- | --- |
| Seminary Attendance | `/attendance/` | Daily roll call, late/missed log, pupils, courses, exams, applications (with scan-to-fill), Hebrew-calendar diary, tasks |
| Seminary Fees Office | `/fees/` | Tuition & discounts per pupil, one-off fee charges, family statements |
| Seminary Finance | `/finance/` | Dashboard/reports, transactions, invoices, expenses, suppliers, bank accounts, pledges, loans, charity receipts, staff & contacts, **QuickBooks CSV import** |

The three sites share one database — a pupil registered on the Attendance site
appears on the Fees site immediately — but access is separate: each user
account is granted specific sites, signing in happens per site, and a session
for one site cannot call another site's API (enforced server-side, per token).

**Separate domains:** set `PORTAL_DOMAINS`, e.g.
`PORTAL_DOMAINS=attendance.school.org=attendance,fees.school.org=fees,finance.school.org=finance`
and point all three domains at the server — each domain then serves only its
own site. Alternatively run three instances, each with `PORTAL=attendance`
(or `fees`/`finance`) to serve a single site at the root.

## Stack

- **Database:** PostgreSQL 16 (plain-SQL migrations in `server/migrations/`)
- **Backend:** Node 22 + Express + Knex, JWT auth with `admin`/`staff` roles,
  `@hebcal/core` for the Hebrew calendar
- **Frontend:** React 18 + Vite (three separate app entries sharing one component
  library), Recharts for the finance chart

## Getting started

```bash
# 1. Database (adjust DATABASE_URL if yours differs)
createuser seminary --pwprompt   # password: seminary_dev
createdb seminary -O seminary

# (Or with Docker: docker compose up --build  →  http://localhost:3001)

# 2. Backend — runs migrations on boot; seed adds demo data + logins
cd server
npm install
npm run seed        # once, on a fresh database
npm start           # API + built frontend on http://localhost:3001

# 3. Frontend
cd ../client
npm install
npm run build       # production build served by the API server
# or: npm run dev   # Vite dev server on :5173 proxying /api to :3001
```

**Demo logins (per site):**
- `admin@seminary.local` / `admin123` — access to all three sites
- `attendance@seminary.local` / `attend123` — Seminary Attendance only (staff role)
- `fees@seminary.local` / `fees123` — Seminary Fees Office only
- `finance@seminary.local` / `finance123` — Seminary Finance only
- `staff@seminary.local` / `staff123` — Attendance only, staff role (no deletes)

Environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT` (default 3001).

## API overview

- `POST /api/auth/login`, `GET /api/auth/me`, admin user management under `/api/auth/users`
- Generic CRUD for every entity (pupils, courses, enrollments, staff, contacts,
  attendance, exams, exam_results, exam_levels, lessons, applications,
  transactions, invoices, expenses, expense_allocations, pupil_fees,
  charity_receipts, pledges, loans, suppliers, bank_accounts, diary_events,
  tasks, school_years, groups, classes, settings):
  `GET/POST /api/:entity`, `GET/PUT/DELETE /api/:entity/:id`,
  `GET /api/:entity/options` — with `?q=` search, `?sort=&dir=`,
  `?column=value` filters, and reference labels/child records attached.
- `GET /api/dashboard/report?from&to&category&type` — totals, monthly trend,
  category breakdown, transaction feed
- `GET|POST /api/attendance-tools/rollcall`, `GET /api/attendance-tools/log`,
  `GET /api/attendance-tools/daily-counts`
- `GET /api/calendar?from&to` — diary events + Jewish holidays/parsha + Hebrew dates
- `GET /api/export/{pupils|staff|attendance|transactions|contacts|courses}.csv`
- `POST /api/import/quickbooks/preview` and `POST /api/import/quickbooks` —
  QuickBooks report CSV import (idempotent via per-row external refs)
- `POST /api/import/application-scan` — reads a photo/PDF of a paper
  application form with Claude vision (handwriting and Yiddish/Hebrew
  supported) and returns pre-filled application fields for review.
  Requires `ANTHROPIC_API_KEY` to be set on the server.

## Business rules implemented (defaults — confirm before go-live)

- **Net tuition** = Full Tuition − Discount (computed column, always in sync)
- **Roll call** upserts one status per pupil per date (optionally per course)
- **Recurring tasks**: completing one spawns the next occurrence `recur_days` later
- **Accepting an application** creates the pupil record automatically
- **Lessons log** snapshots the staff rate at entry time (`quantity × rate`);
  staff running balances are currently manual fields — see open questions in the
  project proposal
- **QuickBooks import** maps income/expense by amount sign and transaction type,
  categorizes by QuickBooks account, and never duplicates rows on re-import
