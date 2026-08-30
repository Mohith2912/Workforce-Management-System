import { prisma } from "../config/prisma.js";
import { HttpError } from "../middleware/error.js";
import { audit } from "../utils/audit.js";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function listEmployees() {
  return prisma.employee.findMany({
    include: { department: true, manager: true, user: { select: { email: true, role: true, isActive: true } }, shift: true },
    orderBy: { employeeCode: "asc" },
  });
}

export async function getMe(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    include: {
      department: true,
      manager: true,
      shift: true,
      user: { select: { email: true, role: true } },
      leaveBalances: { include: { leaveType: true } },
    },
  });
  if (!employee) throw new HttpError(404, "Employee profile not found");
  return employee;
}

export async function getEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { department: true, manager: true, shift: true, user: { select: { email: true, role: true } } },
  });
  if (!employee) throw new HttpError(404, "Employee not found");
  return employee;
}

export async function listDepartments() {
  return prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } });
}

export async function createDepartment(name: string, location: string, actorId: string) {
  const dept = await prisma.department.create({ data: { name, location } });
  await audit(actorId, "CREATE_DEPARTMENT", "Department", dept.id, { name });
  return dept;
}

export async function createEmployee(input: {
  email: string;
  password: string;
  role: Role;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: Date;
  probationEndDate?: Date;
  location: string;
  departmentId: string;
  managerId?: string;
  shiftId?: string;
}, actorId: string) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      employee: {
        create: {
          employeeCode: input.employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          designation: input.designation,
          joiningDate: input.joiningDate,
          probationEndDate: input.probationEndDate,
          location: input.location,
          departmentId: input.departmentId,
          managerId: input.managerId,
          shiftId: input.shiftId,
        },
      },
    },
    include: { employee: true },
  });
  await audit(actorId, "CREATE_EMPLOYEE", "Employee", user.employee!.id);
  return user;
}

export async function listTeam(managerEmployeeId: string) {
  return prisma.employee.findMany({
    where: { managerId: managerEmployeeId },
    include: { department: true, user: { select: { email: true, role: true } } },
  });
}
