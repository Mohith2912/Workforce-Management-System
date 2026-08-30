import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { startOfDay, toDateKey, workingDaysInMonth } from "../utils/dates.js";

export async function generatePayrollSummary(year: number, month: number) {
  const holidays = await prisma.holiday.findMany();
  const holidayKeys = new Set(holidays.map((h) => toDateKey(h.date)));
  const working = workingDaysInMonth(year, month, holidayKeys);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const employees = await prisma.employee.findMany();
  const summaries = [];

  for (const emp of employees) {
    const logs = await prisma.attendanceLog.findMany({
      where: { employeeId: emp.id, workDate: { gte: startOfDay(start), lte: startOfDay(end) } },
    });
    const byDate = new Map(logs.map((l) => [toDateKey(l.workDate), l]));
    let presentDays = 0;
    let paidLeaveDays = 0;
    let lopDays = 0;
    let overtimeMinutes = 0;
    let lateCount = 0;

    for (const day of working) {
      const log = byDate.get(toDateKey(day));
      if (!log) {
        lopDays += 1;
        continue;
      }
      if (log.status === "ON_LEAVE") paidLeaveDays += 1;
      else if (log.status === "HALF_DAY") {
        presentDays += 0.5;
        lopDays += 0.5;
      } else if (log.status === "ABSENT" || log.status === "MISSING_PUNCH") {
        lopDays += 1;
      } else {
        presentDays += 1;
        if (log.status === "LATE") lateCount += 1;
      }
      overtimeMinutes += log.overtimeMinutes;
    }

    const summary = await prisma.payrollSummary.upsert({
      where: { employeeId_year_month: { employeeId: emp.id, year, month } },
      create: {
        employeeId: emp.id,
        year,
        month,
        workingDays: working.length,
        presentDays,
        paidLeaveDays,
        lopDays,
        overtimeMinutes,
        lateCount,
      },
      update: { workingDays: working.length, presentDays, paidLeaveDays, lopDays, overtimeMinutes, lateCount },
      include: { employee: { include: { department: true } } },
    });
    summaries.push(summary);
  }

  try {
    await redis.set(`payroll:${year}-${month}`, JSON.stringify(summaries), "EX", 3600);
  } catch {
    /* ignore */
  }
  return summaries;
}

export async function teamAttendance(managerEmployeeId: string | null, from: Date, to: Date, isAdmin: boolean) {
  const where = isAdmin
    ? { workDate: { gte: startOfDay(from), lte: startOfDay(to) } }
    : { employee: { managerId: managerEmployeeId ?? undefined }, workDate: { gte: startOfDay(from), lte: startOfDay(to) } };
  return prisma.attendanceLog.findMany({
    where,
    include: { employee: { include: { department: true } } },
    orderBy: [{ workDate: "desc" }, { employeeId: "asc" }],
  });
}

export async function leaveTrends(year: number) {
  const requests = await prisma.leaveRequest.findMany({
    where: { startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }, status: "APPROVED" },
    include: { leaveType: true },
  });
  const byType: Record<string, number> = {};
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const r of requests) {
    byType[r.leaveType.code] = (byType[r.leaveType.code] ?? 0) + r.days;
    byMonth[r.startDate.getMonth()] += r.days;
  }
  return { byType, byMonth };
}

export async function openRequests() {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { employee: true, leaveType: true },
    orderBy: { createdAt: "asc" },
  });
}
