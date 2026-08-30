import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { auth, employees, leaves, attendance, reports, misc } from "../controllers/index.js";

export const router = Router();

router.post("/auth/login", rateLimit("auth", 20, 60), auth.login);
router.post("/auth/refresh", auth.refresh);
router.post("/auth/logout", auth.logout);

router.get("/employees/me", requireAuth, employees.me);
router.get("/employees/team", requireAuth, requireRole("MANAGER", "ADMIN"), employees.team);
router.get("/employees", requireAuth, requireRole("MANAGER", "ADMIN"), employees.list);
router.post("/employees", requireAuth, requireRole("ADMIN"), employees.create);
router.get("/employees/:id", requireAuth, requireRole("MANAGER", "ADMIN"), employees.get);
router.get("/departments", requireAuth, employees.departments);
router.post("/departments", requireAuth, requireRole("ADMIN"), employees.createDepartment);
router.get("/shifts", requireAuth, employees.shifts);

router.get("/leaves/types", requireAuth, leaves.types);
router.post("/leaves", requireAuth, leaves.apply);
router.get("/leaves/me", requireAuth, leaves.mine);
router.get("/leaves/balances", requireAuth, leaves.balances);
router.get("/leaves/pending", requireAuth, requireRole("MANAGER", "ADMIN"), leaves.pending);
router.patch("/leaves/:id/approve", requireAuth, requireRole("MANAGER", "ADMIN"), leaves.approve);
router.patch("/leaves/:id/reject", requireAuth, requireRole("MANAGER", "ADMIN"), leaves.reject);
router.patch("/leaves/:id/cancel", requireAuth, leaves.cancel);
router.put("/leave-policies/:leaveTypeId", requireAuth, requireRole("ADMIN"), leaves.updatePolicy);

router.post("/attendance/check-in", requireAuth, attendance.checkIn);
router.post("/attendance/check-out", requireAuth, attendance.checkOut);
router.get("/attendance/me", requireAuth, attendance.mine);
router.post("/attendance/regularization", requireAuth, attendance.regularize);
router.get("/attendance/regularization/me", requireAuth, attendance.myRegs);
router.get("/attendance/regularization/pending", requireAuth, requireRole("MANAGER", "ADMIN"), attendance.pendingRegs);
router.patch("/attendance/regularization/:id/:action", requireAuth, requireRole("MANAGER", "ADMIN"), attendance.decideReg);

router.get("/reports/team-attendance", requireAuth, requireRole("MANAGER", "ADMIN"), reports.teamAttendance);
router.get("/reports/payroll-summary", requireAuth, requireRole("MANAGER", "ADMIN"), reports.payroll);
router.get("/reports/leave-trends", requireAuth, requireRole("MANAGER", "ADMIN"), reports.leaveTrends);
router.get("/reports/open-requests", requireAuth, requireRole("MANAGER", "ADMIN"), reports.openRequests);

router.get("/dashboard", requireAuth, misc.dashboard);
router.get("/notifications", requireAuth, misc.notifications);
router.patch("/notifications/:id/read", requireAuth, misc.readNotification);
router.get("/holidays", requireAuth, misc.holidays);
router.post("/holidays", requireAuth, requireRole("ADMIN"), misc.createHoliday);
router.get("/audit-logs", requireAuth, requireRole("ADMIN"), misc.audit);
router.post("/jobs/:name", requireAuth, requireRole("ADMIN"), misc.runJob);
