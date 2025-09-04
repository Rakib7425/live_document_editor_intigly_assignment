import "dotenv/config";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://:redispass:localhost:6379/0";

export const redis = new Redis(redisUrl);

redis.on("error", (err: any) => {
  console.error("Redis error", err);
});

export async function ensureRedisConnected(): Promise<void> {
  try {
    await redis.ping();
    console.log("🚀 Redis successfully connected");
  } catch (err) {
    console.error("❌ Redis not connected:", err);
  }
}
