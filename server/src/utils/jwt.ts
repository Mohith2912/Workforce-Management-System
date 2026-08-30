import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";

export type AccessPayload = { sub: string; role: Role; employeeId?: string };

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtRefreshSecret, { expiresIn: "7d" });
}

export function verifyAccess(token: string) {
  return jwt.verify(token, env.jwtSecret) as AccessPayload;
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string };
}
