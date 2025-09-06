import "dotenv/config";
import { Redis } from "ioredis";

export const redisConfig = {
  host: process.env.REDIS_HOSTNAME || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  username: process.env.REDIS_USERNAME || "redisuser",
  password: process.env.REDIS_PASSWORD || "redispass123",
  db: Number(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  ...(process.env.REDIS_IS_TLS === "true" ? { tls: {} } : {}),
};

// Use REDIS_URL if provided, otherwise construct from config
const redisUrl =
  process.env.REDIS_URL ||
  `redis://${redisConfig.username}:${redisConfig.password}@${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`;

export const redis = new Redis(redisUrl);

redis.on("connect", () => {
  console.log("🚀 Redis connection established");
});

redis.on("ready", () => {
  console.log("✅ Redis is ready to receive commands");
});

redis.on("error", (err: any) => {
  console.error("❌ Redis error:", err.message);
  if (err.message.includes("NOAUTH")) {
    console.error(
      "🔐 Redis authentication failed. Check your password configuration."
    );
  }
});

redis.on("close", () => {
  console.log("🔌 Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

export async function isRedisDBConnected(): Promise<boolean> {
  try {
    // Connect if not already connected
    if (redis.status !== "ready") {
      await redis.connect();
    }

    const result = await redis.ping();
    if (result === "PONG") {
      console.log("✅ Redis successfully connected and authenticated");
      return true;
    } else {
      console.error("❌ Redis ping failed:", result);
      return false;
    }
  } catch (err: any) {
    console.error("❌ Redis connection failed:", err.message);
    if (err.message.includes("NOAUTH")) {
      console.error(
        "🔐 Authentication failed. Please check your Redis password in .env file"
      );
    }
    return false;
  }
}
