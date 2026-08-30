# Architecture

## Modules

- **Auth & roles** — JWT access (15m) + refresh (7d), RBAC `EMPLOYEE` / `MANAGER` / `ADMIN`
- **Employee master** — profile, department, designation, manager, joining / probation dates, shift
- **Leave policy** — casual, sick, earned; accrual, carry-forward, encashment, probation flags
- **Leave workflow** — apply, approve, reject, cancel, comments, manager (or admin) approval task
- **Attendance** — check-in/out, late, half-day, missing punch, regularization
- **Holiday calendar** — public and location-specific holidays; weekends excluded from leave days
- **Leave balance engine** — pending reservation, post-approval deduction, monthly accrual job, year-end carry-forward
- **Reports** — team attendance, leave trends, open requests, payroll snapshot export
- **Audit logs** — login, policy edits, leave decisions, punches, regularizations
- **Notifications** — in-app (and reminder jobs) for approvals and status changes

## Data model (Prisma)

`users`, `roles` (enum on user), `employees`, `departments`, `leave_types`, `leave_policies`, `leave_balances`, `leave_requests`, `leave_approvals`, `attendance_logs`, `attendance_regularizations`, `shifts`, `holidays`, `payroll_summaries`, `notifications`, `audit_logs`

Relationships:

- Employee → one department, optional manager, optional shift
- Leave request → one employee, one leave type, many approval rows
- Employee → many attendance logs and leave balances
- Payroll summaries generated from attendance + approved leave

## Redis

- `dashboard:{userId}` — short-lived dashboard JSON
- `pending-approvals:{userId}` — pending count
- `refresh:{hash}` — refresh token index
- `auth:{ip}` — login rate limit
- BullMQ `wms-jobs` — accrual, payroll snapshot, approval reminders

## Build order implemented

Auth → employees/departments → leave types/policies → request/approval → attendance → balance engine → reports/payroll → Redis/jobs → Docker/README.
