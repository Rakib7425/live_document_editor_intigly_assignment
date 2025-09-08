import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = process.env.APP_SERVER_PORT || 4002;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const distDir = path.resolve(__dirname, "../dist");

console.log("Serving from:", distDir);

app.use(
  cors({
    origin: "*",
  })
);

// Serve static files
app.use(
  express.static(distDir, {
    index: false,
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === ".html") {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, success: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`✅ App Server is running on port ${port}`);
});
