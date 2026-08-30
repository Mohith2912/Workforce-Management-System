import { prisma } from "../config/prisma.js";
import { HttpError } from "../middleware/error.js";
import { audit } from "../utils/audit.js";
import { parseTimeOnDate, startOfDay, toDateKey } from "../utils/dates.js";
import { notify } from "./notification.service.js";
import type { AttendanceStatus } from "@prisma/client";

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function computeStatus(opts: {
  checkIn?: Date | null;
  checkOut?: Date | null;
  shiftStart: Date;
  lateAfterMinutes: number;
  halfDayMinutes: number;
}): { status: AttendanceStatus; workMinutes: number; lateMinutes: number; overtimeMinutes: number } {
  const { checkIn, checkOut } = opts;
  if (!checkIn) {
    return { status: "MISSING_PUNCH", workMinutes: 0, lateMinutes: 0, overtimeMinutes: 0 };
  }
  const lateMinutes = Math.max(0, minutesBetween(opts.shiftStart, checkIn) > opts.lateAfterMinutes ? minutesBetween(opts.shiftStart, checkIn) : 0);
  if (!checkOut) {
    return { status: "MISSING_PUNCH", workMinutes: 0, lateMinutes, overtimeMinutes: 0 };
  }
  const workMinutes = minutesBetween(checkIn, checkOut);
  const shiftMinutes = minutesBetween(opts.shiftStart, parseTimeOnDate(opts.shiftStart, "18:00"));
  const overtimeMinutes = Math.max(0, workMinutes - shiftMinutes);
  let status: AttendanceStatus = "PRESENT";
  if (workMinutes < opts.halfDayMinutes) status = "HALF_DAY";
  else if (lateMinutes > 0) status = "LATE";
  return { status, workMinutes, lateMinutes, overtimeMinutes };
}

export async function checkIn(employeeId: string, userId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { shift: true } });
  if (!employee) throw new HttpError(404, "Employee not found");
  const today = startOfDay(new Date());
  const existing = await prisma.attendanceLog.findUnique({
    where: { employeeId_workDate: { employeeId, workDate: today } },
  });
  if (existing?.checkIn) throw new HttpError(400, "Already checked in today");
  if (existing?.status === "ON_LEAVE") throw new HttpError(400, "Approved leave is recorded for today");

  const shift = employee.shift ?? (await prisma.shift.findFirst());
  if (!shift) throw new HttpError(400, "No shift configured");
  const now = new Date();
  const computed = computeStatus({
    checkIn: now,
    checkOut: null,
    shiftStart: parseTimeOnDate(today, shift.startTime),
    lateAfterMinutes: shift.lateAfterMinutes,
    halfDayMinutes: shift.halfDayMinutes,
  });

  const log = await prisma.attendanceLog.upsert({
    where: { employeeId_workDate: { employeeId, workDate: today } },
    create: {
      employeeId,
      shiftId: shift.id,
      workDate: today,
      checkIn: now,
      ...computed,
    },
    update: { checkIn: now, shiftId: shift.id, ...computed },
  });
  await audit(userId, "CHECK_IN", "AttendanceLog", log.id, { workDate: toDateKey(today) });
  return log;
}

export async function checkOut(employeeId: string, userId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { shift: true } });
  if (!employee) throw new HttpError(404, "Employee not found");
  const today = startOfDay(new Date());
  const log = await prisma.attendanceLog.findUnique({
    where: { employeeId_workDate: { employeeId, workDate: today } },
  });
  if (!log?.checkIn) throw new HttpError(400, "Check in first");
  if (log.checkOut) throw new HttpError(400, "Already checked out");

  const shift = employee.shift ?? (await prisma.shift.findFirst());
  if (!shift) throw new HttpError(400, "No shift configured");
  const now = new Date();
  const computed = computeStatus({
    checkIn: log.checkIn,
    checkOut: now,
    shiftStart: parseTimeOnDate(today, shift.startTime),
    lateAfterMinutes: shift.lateAfterMinutes,
    halfDayMinutes: shift.halfDayMinutes,
  });
  const updated = await prisma.attendanceLog.update({
    where: { id: log.id },
    data: { checkOut: now, ...computed },
  });
  await audit(userId, "CHECK_OUT", "AttendanceLog", log.id);
  return updated;
}

export async function myAttendance(employeeId: string, from?: Date, to?: Date) {
  return prisma.attendanceLog.findMany({
    where: {
      employeeId,
      workDate: {
        gte: from ? startOfDay(from) : undefined,
        lte: to ? startOfDay(to) : undefined,
      },
    },
    include: { shift: true },
    orderBy: { workDate: "desc" },
    take: 90,
  });
}

export async function requestRegularization(params: {
  employeeId: string;
  userId: string;
  workDate: Date;
  requestedIn?: Date;
  requestedOut?: Date;
  reason: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: { manager: true },
  });
  if (!employee) throw new HttpError(404, "Employee not found");
  const workDate = startOfDay(params.workDate);
  const row = await prisma.attendanceRegularization.create({
    data: {
      employeeId: params.employeeId,
      workDate,
      requestedIn: params.requestedIn,
      requestedOut: params.requestedOut,
      reason: params.reason,
    },
  });
  if (employee.manager) {
    await notify(
      employee.manager.userId,
      "ATTENDANCE",
      "Regularization pending",
      `${employee.firstName} requested attendance regularization for ${toDateKey(workDate)}`,
    );
  }
  await audit(params.userId, "REQUEST_REGULARIZATION", "AttendanceRegularization", row.id);
  return row;
}

export async function decideRegularization(params: {
  id: string;
  approverId: string;
  action: "APPROVED" | "REJECTED";
  comments?: string;
}) {
  const row = await prisma.attendanceRegularization.findUnique({
    where: { id: params.id },
    include: { employee: { include: { shift: true } } },
  });
  if (!row || row.status !== "PENDING") throw new HttpError(404, "Regularization not found");

  if (params.action === "REJECTED") {
    const updated = await prisma.attendanceRegularization.update({
      where: { id: params.id },
      data: { status: "REJECTED", approverId: params.approverId, comments: params.comments },
    });
    await notify(row.employee.userId, "ATTENDANCE", "Regularization rejected", params.comments ?? "Rejected");
    return updated;
  }

  const shift = row.employee.shift ?? (await prisma.shift.findFirst());
  if (!shift) throw new HttpError(400, "No shift configured");
  const checkIn = params.action === "APPROVED" ? row.requestedIn : null;
  const checkOut = row.requestedOut;
  const computed = computeStatus({
    checkIn,
    checkOut,
    shiftStart: parseTimeOnDate(row.workDate, shift.startTime),
    lateAfterMinutes: shift.lateAfterMinutes,
    halfDayMinutes: shift.halfDayMinutes,
  });

  await prisma.$transaction([
    prisma.attendanceRegularization.update({
      where: { id: params.id },
      data: { status: "APPROVED", approverId: params.approverId, comments: params.comments },
    }),
    prisma.attendanceLog.upsert({
      where: { employeeId_workDate: { employeeId: row.employeeId, workDate: row.workDate } },
      create: {
        employeeId: row.employeeId,
        shiftId: shift.id,
        workDate: row.workDate,
        checkIn: row.requestedIn,
        checkOut: row.requestedOut,
        ...computed,
        notes: "Regularized",
      },
      update: {
        checkIn: row.requestedIn,
        checkOut: row.requestedOut,
        shiftId: shift.id,
        ...computed,
        notes: "Regularized",
      },
    }),
  ]);
  await audit(params.approverId, "APPROVE_REGULARIZATION", "AttendanceRegularization", params.id);
  await notify(row.employee.userId, "ATTENDANCE", "Regularization approved", "Attendance record updated");
  return prisma.attendanceRegularization.findUnique({ where: { id: params.id } });
}

export async function pendingRegularizations(managerEmployeeId: string) {
  return prisma.attendanceRegularization.findMany({
    where: { status: "PENDING", employee: { managerId: managerEmployeeId } },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function myRegularizations(employeeId: string) {
  return prisma.attendanceRegularization.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });
}
