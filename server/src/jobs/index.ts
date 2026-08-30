import cron from "node-cron";
import { Queue, Worker } from "bullmq";
import { env } from "../config/env.js";
import { accrueMonthly, carryForward } from "../services/leave-balance.service.js";
import { generatePayrollSummary } from "../services/report.service.js";
import { prisma } from "../config/prisma.js";
import { notify } from "../services/notification.service.js";
import { yearMonth } from "../utils/dates.js";

let queue: Queue | null = null;

export function startJobs() {
  try {
    queue = new Queue("wms-jobs", { connection: { url: env.redisUrl } });
    new Worker(
      "wms-jobs",
      async (job) => {
        if (job.name === "accrual") return accrueMonthly();
        if (job.name === "payroll") {
          const { year, month } = yearMonth();
          return generatePayrollSummary(year, month);
        }
        if (job.name === "reminders") return sendReminders();
        if (job.name === "carry-forward") return carryForward(new Date().getFullYear() - 1);
      },
      { connection: { url: env.redisUrl } },
    );
  } catch (err) {
    console.warn("BullMQ queue not started", err);
  }

  cron.schedule("0 2 1 * *", () => {
    void accrueMonthly();
    void queue?.add("accrual", {});
  });
  cron.schedule("0 3 1 * *", () => {
    const { year, month } = yearMonth();
    void generatePayrollSummary(year, month);
    void queue?.add("payroll", {});
  });
  cron.schedule("0 9 * * 1-5", () => {
    void sendReminders();
    void queue?.add("reminders", {});
  });
}

async function sendReminders() {
  const pending = await prisma.leaveApproval.findMany({
    where: { status: "PENDING", leaveRequest: { status: "PENDING" } },
    include: { leaveRequest: { include: { employee: true } } },
  });
  for (const a of pending) {
    await notify(
      a.approverId,
      "REMINDER",
      "Pending leave approval",
      `${a.leaveRequest.employee.firstName} still needs a decision`,
    );
  }
  return { sent: pending.length };
}

export async function runJob(name: "accrual" | "payroll" | "carry-forward") {
  if (name === "accrual") return accrueMonthly();
  if (name === "carry-forward") return carryForward(new Date().getFullYear() - 1);
  const { year, month } = yearMonth();
  return generatePayrollSummary(year, month);
}
