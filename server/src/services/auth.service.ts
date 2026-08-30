import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { HttpError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefresh } from "../utils/jwt.js";
import { audit } from "../utils/audit.js";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { employee: true },
  });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid credentials");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    employeeId: user.employee?.id,
  });
  const refreshToken = signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  try {
    await redis.set(`refresh:${tokenHash}`, user.id, "EX", 7 * 24 * 60 * 60);
  } catch {
    /* ignore */
  }

  await audit(user.id, "LOGIN", "User", user.id);
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, userId: payload.sub, expiresAt: { gt: new Date() } },
  });
  if (!stored) throw new HttpError(401, "Refresh token revoked");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { employee: true },
  });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid refresh token");

  return {
    accessToken: signAccessToken({
      sub: user.id,
      role: user.role,
      employeeId: user.employee?.id,
    }),
  };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  try {
    await redis.del(`refresh:${tokenHash}`);
  } catch {
    /* ignore */
  }
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found");
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");
  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
