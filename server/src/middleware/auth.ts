import type { NextFunction, Request, Response } from "express";
import { verifyAccess } from "../utils/jwt.js";
import { HttpError } from "./error.js";
import type { Role } from "@prisma/client";

export type AuthUser = { id: string; role: Role; employeeId?: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return next(new HttpError(401, "Unauthorized"));
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role, employeeId: payload.employeeId };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Unauthorized"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Forbidden"));
    next();
  };
}
