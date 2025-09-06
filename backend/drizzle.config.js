import "dotenv/config";
export default {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.POSTGRES_DB_URL ??
            "postgres://postgres:postgres@localhost:5432/rtc_docs",
    },
};
//# sourceMappingURL=drizzle.config.js.map