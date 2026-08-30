import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { HttpError } from "../middleware/error.js";
import { audit } from "../utils/audit.js";
import { eachDate, isWeekend, startOfDay, toDateKey } from "../utils/dates.js";
import { notify } from "./notification.service.js";
import { LeaveRequestStatus, Role } from "@prisma/client";

async function holidaySet(location: string) {
  const rows = await prisma.holiday.findMany({
    where: { OR: [{ location: "ALL" }, { location }] },
  });
  return new Set(rows.map((h) => toDateKey(h.date)));
}

export async function countableLeaveDays(start: Date, end: Date, location: string) {
  const holidays = await holidaySet(location);
  let days = 0;
  for (const d of eachDate(start, end)) {
    if (!isWeekend(d) && !holidays.has(toDateKey(d))) days += 1;
  }
  return days;
}

export async function listLeaveTypes() {
  return prisma.leaveType.findMany({ include: { policy: true }, orderBy: { code: "asc" } });
}

export async function upsertPolicy(
  leaveTypeId: string,
  data: {
    annualQuota: number;
    accrualPerMonth: number;
    carryForwardMax: number;
    encashable: boolean;
    probationEligible: boolean;
    minNoticeDays: number;
    maxConsecutiveDays: number;
  },
  actorId: string,
) {
  const policy = await prisma.leavePolicy.upsert({
    where: { leaveTypeId },
    create: { leaveTypeId, ...data },
    update: data,
  });
  await audit(actorId, "UPDATE_LEAVE_POLICY", "LeavePolicy", policy.id, data);
  try {
    await redis.del("cache:leave-types");
  } catch {
    /* ignore */
  }
  return policy;
}

export async function myBalances(employeeId: string, year = new Date().getFullYear()) {
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
  });
}

export async function applyLeave(params: {
  employeeId: string;
  userId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: { manager: { include: { user: true } }, user: true },
  });
  if (!employee) throw new HttpError(404, "Employee not found");

  const type = await prisma.leaveType.findUnique({ where: { id: params.leaveTypeId }, include: { policy: true } });
  if (!type?.policy) throw new HttpError(400, "Leave type has no policy");

  const start = startOfDay(params.startDate);
  const end = startOfDay(params.endDate);
  if (end < start) throw new HttpError(400, "End date cannot be before start date");

  const noticeDays = Math.floor((start.getTime() - startOfDay(new Date()).getTime()) / 86400000);
  if (noticeDays < type.policy.minNoticeDays) {
    throw new HttpError(400, `Minimum notice is ${type.policy.minNoticeDays} day(s)`);
  }

  if (employee.probationEndDate && start < employee.probationEndDate && !type.policy.probationEligible) {
    throw new HttpError(400, `${type.name} is not allowed during probation`);
  }

  const days = await countableLeaveDays(start, end, employee.location);
  if (days <= 0) throw new HttpError(400, "Selected range has no working days");
  if (days > type.policy.maxConsecutiveDays) {
    throw new HttpError(400, `Maximum consecutive days is ${type.policy.maxConsecutiveDays}`);
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) throw new HttpError(400, "Overlapping leave request exists");

  const year = start.getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: type.id, year } },
  });
  if (!balance) throw new HttpError(400, "No leave balance for this year");
  const available = balance.entitled + balance.carriedForward - balance.used - balance.pending;
  if (days > available) throw new HttpError(400, "Insufficient leave balance");

  const request = await prisma.$transaction(async (tx) => {
    const req = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: type.id,
        startDate: start,
        endDate: end,
        days,
        reason: params.reason,
      },
    });
    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: { pending: { increment: days } },
    });

    const approverUserId = employee.manager?.userId ?? (await firstAdminId());
    await tx.leaveApproval.create({
      data: { leaveRequestId: req.id, approverId: approverUserId, level: 1 },
    });
    return req;
  });

  const approverUserId = employee.manager?.userId ?? (await firstAdminId());
  await notify(
    approverUserId,
    "LEAVE_REQUEST",
    "Leave approval needed",
    `${employee.firstName} ${employee.lastName} requested ${days} day(s) of ${type.name}`,
  );
  try {
    await redis.del(`pending-approvals:${approverUserId}`);
  } catch {
    /* ignore */
  }
  await audit(params.userId, "APPLY_LEAVE", "LeaveRequest", request.id, { days });
  return prisma.leaveRequest.findUnique({
    where: { id: request.id },
    include: { leaveType: true, approvals: true },
  });
}

async function firstAdminId() {
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) throw new HttpError(500, "No admin approver configured");
  return admin.id;
}

export async function myLeaves(employeeId: string) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    include: { leaveType: true, approvals: { include: { approver: { select: { email: true, role: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function pendingApprovals(approverId: string) {
  return prisma.leaveApproval.findMany({
    where: { approverId, status: "PENDING", leaveRequest: { status: "PENDING" } },
    include: {
      leaveRequest: {
        include: { leaveType: true, employee: { include: { department: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function pendingCount(approverId: string) {
  const cacheKey = `pending-approvals:${approverId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return Number(cached);
  } catch {
    /* ignore */
  }
  const count = await prisma.leaveApproval.count({
    where: { approverId, status: "PENDING", leaveRequest: { status: "PENDING" } },
  });
  try {
    await redis.set(cacheKey, String(count), "EX", 30);
  } catch {
    /* ignore */
  }
  return count;
}

export async function decideLeave(params: {
  requestId: string;
  approverId: string;
  action: "APPROVED" | "REJECTED";
  comments?: string;
}) {
  const approval = await prisma.leaveApproval.findFirst({
    where: { leaveRequestId: params.requestId, approverId: params.approverId, status: "PENDING" },
    include: { leaveRequest: { include: { employee: true, leaveType: true } } },
  });
  if (!approval) throw new HttpError(404, "Approval task not found");

  await prisma.$transaction(async (tx) => {
    await tx.leaveApproval.update({
      where: { id: approval.id },
      data: { status: params.action, comments: params.comments, actedAt: new Date() },
    });
    await tx.leaveRequest.update({
      where: { id: params.requestId },
      data: { status: params.action },
    });
    const days = approval.leaveRequest.days;
    const year = approval.leaveRequest.startDate.getFullYear();
    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: approval.leaveRequest.employeeId,
          leaveTypeId: approval.leaveRequest.leaveTypeId,
          year,
        },
      },
    });
    if (!balance) throw new HttpError(400, "Balance missing");
    await tx.leaveBalance.update({
      where: { id: balance.id },
      data:
        params.action === "APPROVED"
          ? { pending: { decrement: days }, used: { increment: days } }
          : { pending: { decrement: days } },
    });

    if (params.action === "APPROVED") {
      for (const d of eachDate(approval.leaveRequest.startDate, approval.leaveRequest.endDate)) {
        if (isWeekend(d)) continue;
        await tx.attendanceLog.upsert({
          where: { employeeId_workDate: { employeeId: approval.leaveRequest.employeeId, workDate: startOfDay(d) } },
          create: {
            employeeId: approval.leaveRequest.employeeId,
            workDate: startOfDay(d),
            status: "ON_LEAVE",
            notes: `Approved ${approval.leaveRequest.leaveType.name}`,
          },
          update: { status: "ON_LEAVE", notes: `Approved ${approval.leaveRequest.leaveType.name}` },
        });
      }
    }
  });

  await notify(
    approval.leaveRequest.employee.userId,
    "LEAVE_STATUS",
    `Leave ${params.action.toLowerCase()}`,
    params.comments ?? `Your leave request was ${params.action.toLowerCase()}`,
  );
  await audit(params.approverId, params.action === "APPROVED" ? "APPROVE_LEAVE" : "REJECT_LEAVE", "LeaveRequest", params.requestId, {
    comments: params.comments,
  });
  try {
    await redis.del(`pending-approvals:${params.approverId}`);
    await redis.del(`dashboard:${approval.leaveRequest.employee.userId}`);
  } catch {
    /* ignore */
  }
  return prisma.leaveRequest.findUnique({
    where: { id: params.requestId },
    include: { leaveType: true, approvals: true },
  });
}

export async function cancelLeave(requestId: string, employeeId: string, userId: string) {
  const req = await prisma.leaveRequest.findFirst({ where: { id: requestId, employeeId } });
  if (!req) throw new HttpError(404, "Leave request not found");
  if (req.status !== "PENDING") throw new HttpError(400, "Only pending requests can be cancelled");

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
    await tx.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId: req.leaveTypeId,
          year: req.startDate.getFullYear(),
        },
      },
      data: { pending: { decrement: req.days } },
    });
  });
  await audit(userId, "CANCEL_LEAVE", "LeaveRequest", requestId);
  return { ok: true };
}
