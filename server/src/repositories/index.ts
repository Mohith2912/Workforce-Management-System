import { prisma } from "../config/prisma.js";

export const employeeRepo = {
  findByUserId: (userId: string) => prisma.employee.findUnique({ where: { userId } }),
};

export const leaveRepo = {
  byId: (id: string) => prisma.leaveRequest.findUnique({ where: { id } }),
};
