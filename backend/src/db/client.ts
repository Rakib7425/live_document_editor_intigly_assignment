import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/rtc_docs";

export const pg = postgres(connectionString, {
  ssl: false,
});

export const db = drizzle(pg);
