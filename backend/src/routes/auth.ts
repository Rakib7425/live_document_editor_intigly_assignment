import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { listActiveUsers } from "../services/presenceGlobal.js";
import { eq } from "drizzle-orm";

const router = Router();

const loginSchema = z.object({ username: z.string().min(2).max(64) });

router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid username" });
  }
  const { username } = parse.data;

  // Ensure unique by upserting or returning existing
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  let userId: number | undefined;
  if (existing.length > 0) {
    userId = existing[0]?.id;
  } else {
    const inserted = await db
      .insert(users)
      .values({ username })
      .returning({ id: users.id });
    userId = inserted[0]?.id;
  }

  return res.json({ id: userId!, username });
});

export default router;
