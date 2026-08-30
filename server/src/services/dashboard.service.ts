import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { pendingCount } from "./leave.service.js";
import { startOfDay, yearMonth } from "../utils/dates.js";

export async function dashboardStats(userId: string, role: string, employeeId?: string) {
  const cacheKey = `dashboard:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }

  const { year, month } = yearMonth();
  const employees = await prisma.employee.count();
  const pendingLeaves = await prisma.leaveRequest.count({ where: { status: "PENDING" } });
  const myPending = employeeId
    ? await prisma.leaveRequest.count({ where: { employeeId, status: "PENDING" } })
    : 0;
  const approvals = await pendingCount(userId);
  const payroll = employeeId
    ? await prisma.payrollSummary.findUnique({
        where: { employeeId_year_month: { employeeId, year, month } },
      })
    : null;
  const todayLogs = await prisma.attendanceLog.count({
    where: { workDate: startOfDay(new Date()), status: { in: ["PRESENT", "LATE", "HALF_DAY"] } },
  });
  const unread = await prisma.notification.count({ where: { userId, read: false } });

  const stats = {
    employees,
    pendingLeaves,
    myPending,
    approvals,
    unread,
    presentToday: todayLogs,
    payroll,
    month,
    year,
  };
  try {
    await redis.set(cacheKey, JSON.stringify(stats), "EX", 20);
  } catch {
    /* ignore */
  }
  return stats;
}
