# Workforce Management System

Full-stack leave, attendance, and payroll-input platform: React + TypeScript + Material UI on the frontend, Express + Prisma + PostgreSQL on the backend, Redis for cache, rate limits, session tokens, and background jobs.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite, React 19, TypeScript, React Router, TanStack Query, Zustand, MUI |
| Backend | Node.js, Express, TypeScript, JWT + refresh tokens, RBAC |
| Data | PostgreSQL (system of record), Redis (cache / jobs / rate limit) |
| DevOps | Docker Compose |

## Quick start (local)

1. Copy env: `.env.example` is already mirrored as `.env`.
2. Start Postgres and Redis:

```bash
docker compose up postgres redis -d
```

3. API:

```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

4. UI (new terminal):

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

### Demo users

| Email | Password | Role |
| --- | --- | --- |
| `admin@wms.local` | `Admin@123` | Admin |
| `manager@wms.local` | `Manager@123` | Manager |
| `jane@wms.local` | `Employee@123` | Employee |
| `john@wms.local` | `Employee@123` | Employee |

## Docker (all services)

```bash
docker compose up --build
```

UI: http://localhost:5173 · API: http://localhost:4000/health

## Core business rules

- Leave overlap is rejected; weekends and holidays do not consume quota.
- Balance is reserved as **pending** on apply and deducted as **used** only after approval.
- Insufficient balance, probation restrictions, and notice-period rules block apply.
- Attendance computes late / half-day / missing punch / overtime from shift windows.
- Approved leave writes `ON_LEAVE` into the attendance calendar.
- Payroll summaries are generated from attendance logs + approved leave (LOP, paid leave, OT) — not from free-form edits.
- Redis caches dashboard stats and pending-approval counts, rate-limits login, and backs BullMQ jobs (accrual, payroll snapshot, reminders).

## API (selected)

- `POST /api/auth/login` · `POST /api/auth/refresh`
- `GET /api/employees/me`
- `POST /api/leaves` · `GET /api/leaves/me` · `GET /api/leaves/pending`
- `PATCH /api/leaves/:id/approve` · `PATCH /api/leaves/:id/reject`
- `POST /api/attendance/check-in` · `POST /api/attendance/check-out`
- `POST /api/attendance/regularization`
- `GET /api/reports/team-attendance` · `GET /api/reports/payroll-summary`

## Project layout

See `docs/architecture.md` for modules, tables, and Redis usage.
