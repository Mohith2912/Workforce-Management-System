import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { role, passwordHash },
    create: { email, passwordHash, role },
  });
}

async function main() {
  const engineering = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", location: "HQ" },
  });
  const hr = await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: { name: "Human Resources", location: "HQ" },
  });
  const finance = await prisma.department.upsert({
    where: { name: "Finance" },
    update: {},
    create: { name: "Finance", location: "BLR" },
  });

  const general = await prisma.shift.upsert({
    where: { name: "General" },
    update: {},
    create: { name: "General", startTime: "09:00", endTime: "18:00", lateAfterMinutes: 15, halfDayMinutes: 240 },
  });
  await prisma.shift.upsert({
    where: { name: "Early" },
    update: {},
    create: { name: "Early", startTime: "08:00", endTime: "17:00", lateAfterMinutes: 10, halfDayMinutes: 240 },
  });

  const cl = await prisma.leaveType.upsert({
    where: { code: "CL" },
    update: {},
    create: { code: "CL", name: "Casual Leave", paid: true },
  });
  const sl = await prisma.leaveType.upsert({
    where: { code: "SL" },
    update: {},
    create: { code: "SL", name: "Sick Leave", paid: true },
  });
  const el = await prisma.leaveType.upsert({
    where: { code: "EL" },
    update: {},
    create: { code: "EL", name: "Earned Leave", paid: true },
  });

  await prisma.leavePolicy.upsert({
    where: { leaveTypeId: cl.id },
    update: {},
    create: {
      leaveTypeId: cl.id,
      annualQuota: 12,
      accrualPerMonth: 1,
      carryForwardMax: 0,
      encashable: false,
      probationEligible: true,
      minNoticeDays: 1,
      maxConsecutiveDays: 3,
    },
  });
  await prisma.leavePolicy.upsert({
    where: { leaveTypeId: sl.id },
    update: {},
    create: {
      leaveTypeId: sl.id,
      annualQuota: 12,
      accrualPerMonth: 1,
      carryForwardMax: 6,
      encashable: false,
      probationEligible: true,
      minNoticeDays: 0,
      maxConsecutiveDays: 7,
    },
  });
  await prisma.leavePolicy.upsert({
    where: { leaveTypeId: el.id },
    update: {},
    create: {
      leaveTypeId: el.id,
      annualQuota: 15,
      accrualPerMonth: 1.25,
      carryForwardMax: 15,
      encashable: true,
      probationEligible: false,
      minNoticeDays: 7,
      maxConsecutiveDays: 15,
    },
  });

  const adminUser = await upsertUser("admin@wms.local", "Admin@123", Role.ADMIN);
  const managerUser = await upsertUser("manager@wms.local", "Manager@123", Role.MANAGER);
  const janeUser = await upsertUser("jane@wms.local", "Employee@123", Role.EMPLOYEE);
  const johnUser = await upsertUser("john@wms.local", "Employee@123", Role.EMPLOYEE);

  const adminEmp = await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      employeeCode: "WMS-001",
      firstName: "Asha",
      lastName: "Rao",
      designation: "HR Admin",
      joiningDate: new Date("2022-01-10"),
      location: "HQ",
      departmentId: hr.id,
      shiftId: general.id,
    },
  });

  const managerEmp = await prisma.employee.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      employeeCode: "WMS-010",
      firstName: "Vikram",
      lastName: "Shah",
      designation: "Engineering Manager",
      joiningDate: new Date("2021-04-01"),
      location: "HQ",
      departmentId: engineering.id,
      managerId: adminEmp.id,
      shiftId: general.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: janeUser.id },
    update: {},
    create: {
      userId: janeUser.id,
      employeeCode: "WMS-101",
      firstName: "Jane",
      lastName: "Iyer",
      designation: "Software Engineer",
      joiningDate: new Date("2024-02-01"),
      probationEndDate: new Date("2024-08-01"),
      location: "HQ",
      departmentId: engineering.id,
      managerId: managerEmp.id,
      shiftId: general.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: johnUser.id },
    update: {},
    create: {
      userId: johnUser.id,
      employeeCode: "WMS-102",
      firstName: "John",
      lastName: "Mehta",
      designation: "Analyst",
      joiningDate: new Date("2023-06-15"),
      location: "BLR",
      departmentId: finance.id,
      managerId: managerEmp.id,
      shiftId: general.id,
    },
  });

  const year = new Date().getFullYear();
  const employees = await prisma.employee.findMany();
  const types = [cl, sl, el];
  for (const emp of employees) {
    for (const type of types) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: type.id, year } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: type.id,
          year,
          entitled: type.code === "EL" ? 15 : 12,
          carriedForward: type.code === "EL" ? 3 : 0,
        },
      });
    }
  }

  const holidays = [
    { date: new Date(`${year}-01-26`), name: "Republic Day", location: "ALL" },
    { date: new Date(`${year}-08-15`), name: "Independence Day", location: "ALL" },
    { date: new Date(`${year}-10-02`), name: "Gandhi Jayanti", location: "ALL" },
    { date: new Date(`${year}-11-01`), name: "Kannada Rajyotsava", location: "BLR" },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date_location: { date: h.date, location: h.location } },
      update: { name: h.name },
      create: h,
    });
  }

  console.log("Seed complete. Demo logins:");
  console.log("  admin@wms.local / Admin@123");
  console.log("  manager@wms.local / Manager@123");
  console.log("  jane@wms.local / Employee@123");
  console.log("  john@wms.local / Employee@123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
