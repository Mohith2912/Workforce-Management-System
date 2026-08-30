import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis.js";
import { HttpError } from "./error.js";

const memoryHits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyPrefix: string, max: number, windowSec: number) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.ip ?? "unknown"}`;
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, windowSec);
      if (n > max) return next(new HttpError(429, "Too many requests"));
      next();
    } catch {
      const now = Date.now();
      const cur = memoryHits.get(key);
      if (!cur || cur.resetAt < now) {
        memoryHits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return next();
      }
      cur.count += 1;
      if (cur.count > max) return next(new HttpError(429, "Too many requests"));
      next();
    }
  };
}
