import "dotenv/config";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("Redis error", err);
});

export async function ensureRedisConnected(): Promise<void> {
  if ((redis as any).status !== "ready") {
    // ioredis auto-connects, but ensure by forcing a ping
    await redis.ping();
  }
}
