import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export async function connectRedis() {
  try {
    await redis.connect();
    await redis.ping();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis unavailable; continuing with in-memory fallbacks", err);
  }
}
