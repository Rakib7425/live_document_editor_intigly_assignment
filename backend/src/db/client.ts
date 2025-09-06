import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "rtc_docs",
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_IS_SSL === "true" ? true : false,
};

export const pg = postgres(dbConfig);
export const db = drizzle(pg);

// test connection
export async function isPostgresDBConnected(): Promise<boolean> {
  try {
    await pg`SELECT 1`;
    console.log("✅ Database connection established successfully");
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    return false;
  }
}
