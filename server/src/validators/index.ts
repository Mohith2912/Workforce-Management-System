import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const leaveApplySchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(3),
});

export const decisionSchema = z.object({
  comments: z.string().optional(),
});

export const regularizationSchema = z.object({
  workDate: z.string(),
  requestedIn: z.string().optional(),
  requestedOut: z.string().optional(),
  reason: z.string().min(3),
});

export const employeeCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  employeeCode: z.string().min(2),
  firstName: z.string(),
  lastName: z.string(),
  designation: z.string(),
  joiningDate: z.string(),
  probationEndDate: z.string().optional(),
  location: z.string().default("HQ"),
  departmentId: z.string(),
  managerId: z.string().optional(),
  shiftId: z.string().optional(),
});

export const policySchema = z.object({
  annualQuota: z.number(),
  accrualPerMonth: z.number(),
  carryForwardMax: z.number(),
  encashable: z.boolean(),
  probationEligible: z.boolean(),
  minNoticeDays: z.number(),
  maxConsecutiveDays: z.number(),
});
