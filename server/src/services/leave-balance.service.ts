import { prisma } from "../config/prisma.js";
import { yearMonth } from "../utils/dates.js";

export async function accrueMonthly(runDate = new Date()) {
  const { year } = yearMonth(runDate);
  const policies = await prisma.leavePolicy.findMany({ include: { leaveType: true } });
  const employees = await prisma.employee.findMany();
  let updated = 0;

  for (const emp of employees) {
    for (const policy of policies) {
      const onProbation = emp.probationEndDate && runDate < emp.probationEndDate;
      if (onProbation && !policy.probationEligible) continue;

      const existing = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: policy.leaveTypeId,
            year,
          },
        },
      });
      if (!existing) {
        await prisma.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: policy.leaveTypeId,
            year,
            entitled: policy.accrualPerMonth,
            carriedForward: 0,
          },
        });
      } else {
        const nextEntitled = Math.min(policy.annualQuota, existing.entitled + policy.accrualPerMonth);
        await prisma.leaveBalance.update({
          where: { id: existing.id },
          data: { entitled: nextEntitled },
        });
      }
      updated += 1;
    }
  }
  return { updated };
}

export async function carryForward(fromYear: number) {
  const toYear = fromYear + 1;
  const policies = await prisma.leavePolicy.findMany();
  let moved = 0;
  for (const policy of policies) {
    const balances = await prisma.leaveBalance.findMany({
      where: { leaveTypeId: policy.leaveTypeId, year: fromYear },
    });
    for (const bal of balances) {
      const remaining = Math.max(0, bal.entitled + bal.carriedForward - bal.used);
      const carry = Math.min(remaining, policy.carryForwardMax);
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: bal.employeeId,
            leaveTypeId: policy.leaveTypeId,
            year: toYear,
          },
        },
        create: {
          employeeId: bal.employeeId,
          leaveTypeId: policy.leaveTypeId,
          year: toYear,
          entitled: policy.annualQuota,
          carriedForward: carry,
        },
        update: { carriedForward: carry },
      });
      moved += 1;
    }
  }
  return { moved };
}
