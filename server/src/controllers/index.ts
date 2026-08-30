import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";
import * as employeeService from "../services/employee.service.js";
import * as leaveService from "../services/leave.service.js";
import * as attendanceService from "../services/attendance.service.js";
import * as reportService from "../services/report.service.js";
import * as dashboardService from "../services/dashboard.service.js";
import * as notificationService from "../services/notification.service.js";
import { prisma } from "../config/prisma.js";
import { loginSchema, refreshSchema, leaveApplySchema, decisionSchema, regularizationSchema, employeeCreateSchema, policySchema } from "../validators/index.js";
import { HttpError } from "../middleware/error.js";
import { runJob } from "../jobs/index.js";

function asyncH(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const auth = {
  login: asyncH(async (req, res) => {
    const body = loginSchema.parse(req.body);
    res.json(await authService.login(body.email, body.password));
  }),
  refresh: asyncH(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    res.json(await authService.refresh(body.refreshToken));
  }),
  logout: asyncH(async (req, res) => {
    await authService.logout(req.body?.refreshToken);
    res.json({ ok: true });
  }),
};

export const employees = {
  me: asyncH(async (req, res) => {
    res.json(await employeeService.getMe(req.user!.id));
  }),
  list: asyncH(async (_req, res) => {
    res.json(await employeeService.listEmployees());
  }),
  get: asyncH(async (req, res) => {
    res.json(await employeeService.getEmployee(req.params.id as string));
  }),
  create: asyncH(async (req, res) => {
    const body = employeeCreateSchema.parse(req.body);
    res.status(201).json(
      await employeeService.createEmployee(
        {
          ...body,
          joiningDate: new Date(body.joiningDate),
          probationEndDate: body.probationEndDate ? new Date(body.probationEndDate) : undefined,
        },
        req.user!.id,
      ),
    );
  }),
  departments: asyncH(async (_req, res) => {
    res.json(await employeeService.listDepartments());
  }),
  createDepartment: asyncH(async (req, res) => {
    const { name, location } = req.body as { name: string; location?: string };
    res.status(201).json(await employeeService.createDepartment(name, location ?? "HQ", req.user!.id));
  }),
  team: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await employeeService.listTeam(req.user.employeeId));
  }),
  shifts: asyncH(async (_req, res) => {
    res.json(await prisma.shift.findMany({ orderBy: { name: "asc" } }));
  }),
};

export const leaves = {
  types: asyncH(async (_req, res) => {
    res.json(await leaveService.listLeaveTypes());
  }),
  apply: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    const body = leaveApplySchema.parse(req.body);
    res.status(201).json(
      await leaveService.applyLeave({
        employeeId: req.user.employeeId,
        userId: req.user.id,
        leaveTypeId: body.leaveTypeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
      }),
    );
  }),
  mine: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await leaveService.myLeaves(req.user.employeeId));
  }),
  balances: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await leaveService.myBalances(req.user.employeeId));
  }),
  pending: asyncH(async (req, res) => {
    res.json(await leaveService.pendingApprovals(req.user!.id));
  }),
  approve: asyncH(async (req, res) => {
    const body = decisionSchema.parse(req.body ?? {});
    res.json(
      await leaveService.decideLeave({
        requestId: req.params.id as string,
        approverId: req.user!.id,
        action: "APPROVED",
        comments: body.comments,
      }),
    );
  }),
  reject: asyncH(async (req, res) => {
    const body = decisionSchema.parse(req.body ?? {});
    res.json(
      await leaveService.decideLeave({
        requestId: req.params.id as string,
        approverId: req.user!.id,
        action: "REJECTED",
        comments: body.comments,
      }),
    );
  }),
  cancel: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await leaveService.cancelLeave(req.params.id as string, req.user.employeeId, req.user.id));
  }),
  updatePolicy: asyncH(async (req, res) => {
    const body = policySchema.parse(req.body);
    res.json(await leaveService.upsertPolicy(req.params.leaveTypeId as string, body, req.user!.id));
  }),
};

export const attendance = {
  checkIn: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await attendanceService.checkIn(req.user.employeeId, req.user.id));
  }),
  checkOut: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await attendanceService.checkOut(req.user.employeeId, req.user.id));
  }),
  mine: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await attendanceService.myAttendance(req.user.employeeId));
  }),
  regularize: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    const body = regularizationSchema.parse(req.body);
    res.status(201).json(
      await attendanceService.requestRegularization({
        employeeId: req.user.employeeId,
        userId: req.user.id,
        workDate: new Date(body.workDate),
        requestedIn: body.requestedIn ? new Date(body.requestedIn) : undefined,
        requestedOut: body.requestedOut ? new Date(body.requestedOut) : undefined,
        reason: body.reason,
      }),
    );
  }),
  myRegs: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await attendanceService.myRegularizations(req.user.employeeId));
  }),
  pendingRegs: asyncH(async (req, res) => {
    if (!req.user?.employeeId) throw new HttpError(400, "No employee profile");
    res.json(await attendanceService.pendingRegularizations(req.user.employeeId));
  }),
  decideReg: asyncH(async (req, res) => {
    const body = decisionSchema.parse(req.body ?? {});
    const action = req.params.action === "approve" ? "APPROVED" : "REJECTED";
    res.json(
      await attendanceService.decideRegularization({
        id: req.params.id as string,
        approverId: req.user!.id,
        action,
        comments: body.comments,
      }),
    );
  }),
};

export const reports = {
  teamAttendance: asyncH(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const isAdmin = req.user!.role === "ADMIN";
    res.json(await reportService.teamAttendance(req.user!.employeeId ?? null, from, to, isAdmin));
  }),
  payroll: asyncH(async (req, res) => {
    const year = Number(req.query.year ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const generate = String(req.query.generate ?? "") === "true";
    if (generate) {
      res.json(await reportService.generatePayrollSummary(year, month));
      return;
    }
    const rows = await prisma.payrollSummary.findMany({
      where: { year, month },
      include: { employee: { include: { department: true } } },
    });
    res.json(rows.length ? rows : await reportService.generatePayrollSummary(year, month));
  }),
  leaveTrends: asyncH(async (req, res) => {
    res.json(await reportService.leaveTrends(Number(req.query.year ?? new Date().getFullYear())));
  }),
  openRequests: asyncH(async (_req, res) => {
    res.json(await reportService.openRequests());
  }),
};

export const misc = {
  dashboard: asyncH(async (req, res) => {
    res.json(await dashboardService.dashboardStats(req.user!.id, req.user!.role, req.user!.employeeId));
  }),
  notifications: asyncH(async (req, res) => {
    res.json(await notificationService.listNotifications(req.user!.id));
  }),
  readNotification: asyncH(async (req, res) => {
    res.json(await notificationService.markRead(req.user!.id, req.params.id as string));
  }),
  holidays: asyncH(async (_req, res) => {
    res.json(await prisma.holiday.findMany({ orderBy: { date: "asc" } }));
  }),
  createHoliday: asyncH(async (req, res) => {
    const { date, name, location } = req.body as { date: string; name: string; location?: string };
    res.status(201).json(
      await prisma.holiday.create({ data: { date: new Date(date), name, location: location ?? "ALL" } }),
    );
  }),
  audit: asyncH(async (_req, res) => {
    res.json(await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true } } } }));
  }),
  runJob: asyncH(async (req, res) => {
    const name = req.params.name as "accrual" | "payroll" | "carry-forward";
    res.json(await runJob(name));
  }),
};
