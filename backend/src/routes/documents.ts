import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { documents, chatMessages, users } from "../db/schema.js";
import { countPresenceForDocs } from "../services/presence.js";
import { desc, eq, ilike, and } from "drizzle-orm";

const router = Router();

const createSchema = z.object({ title: z.string().min(1).max(256) });

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid title" });
  const { title } = parsed.data;
  const inserted = await db
    .insert(documents)
    .values({ title })
    .returning({ id: documents.id });
  return res.json({ id: inserted[0].id, title });
});

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const rows = await db
    .select()
    .from(documents)
    .where(
      q && q.length > 0 ? ilike(documents.title, `%${q}%`) : (undefined as any)
    )
    .orderBy(desc(documents.updatedAt));
  const ids = rows.map((r: any) => r.id as number);
  const counts = await countPresenceForDocs(ids);
  return res.json(
    rows.map((r: any) => ({ ...r, activeCount: counts[r.id] ?? 0 }))
  );
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  // Load doc and last N messages
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const doc = (
    await db.select().from(documents).where(eq(documents.id, id))
  ).at(0);
  if (!doc) return res.status(404).json({ error: "Not found" });
  const messages = await db
    .select({
      id: chatMessages.id,
      message: chatMessages.message,
      createdAt: chatMessages.createdAt,
      username: users.username,
      userId: users.id,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.authorId, users.id))
    .where(eq(chatMessages.documentId, id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return res.json({ doc, messages: messages.reverse() });
});

export default router;
