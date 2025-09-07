import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { documents, chatMessages, users, documentTemplates } from "../db/schema.js";
import { countPresenceForDocs } from "../services/presence.js";
import {
  getDocumentVersions,
  getDocumentVersion,
} from "../services/versions.js";
import { desc, eq, ilike, and } from "drizzle-orm";
import { io } from "../server.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(256),
  ownerId: z.number().optional(),
  ownerUserName: z.string().optional(),
  templateId: z.number().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
  const { title, ownerId, ownerUserName, templateId } = parsed.data;
  
  // Get template content if templateId is provided
  let content = "";
  if (templateId) {
    const template = await db
      .select({ content: documentTemplates.content })
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, templateId), eq(documentTemplates.isActive, true)))
      .limit(1);
    if (template.length > 0) {
      content = template[0]!.content;
    }
  }
  
  const inserted = await db
    .insert(documents)
    .values({ title, ownerId, ownerUserName, content })
    .returning({ id: documents.id });

  const newDoc = {
    id: inserted[0]?.id || 0,
    title,
    activeCount: 0,
    ownerId,
    ownerUserName,
  };

  // Broadcast new document to all connected users
  io.emit("document:created", newDoc);

  return res.json({ id: inserted[0]?.id || 0, title, ownerId, ownerUserName });
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
  )[0];
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

const updateSchema = z.object({
  title: z.string().min(1).max(256).optional(),
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data" });

  const { title } = parsed.data;
  const doc = (
    await db.select().from(documents).where(eq(documents.id, id))
  )[0];
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const updated = await db
    .update(documents)
    .set({ title, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();

  // Broadcast document update
  io.emit("document:updated", { id, title });

  return res.json(updated[0]);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const doc = (
    await db.select().from(documents).where(eq(documents.id, id))
  )[0];
  if (!doc) return res.status(404).json({ error: "Document not found" });

  await db.delete(documents).where(eq(documents.id, id));

  // Broadcast document deletion
  io.emit("document:deleted", { id });

  return res.json({ success: true });
});

// Get document versions
router.get("/:id/versions", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const doc = (
    await db.select().from(documents).where(eq(documents.id, id))
  )[0];
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const versions = await getDocumentVersions(id);
  return res.json(versions);
});

// Get specific document version
router.get("/:id/versions/:version", async (req, res) => {
  const id = Number(req.params.id);
  const version = Number(req.params.version);

  if (Number.isNaN(id) || Number.isNaN(version)) {
    return res.status(400).json({ error: "Invalid id or version" });
  }

  const doc = (
    await db.select().from(documents).where(eq(documents.id, id))
  )[0];
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const versionData = await getDocumentVersion(id, version);
  if (!versionData) return res.status(404).json({ error: "Version not found" });

  return res.json(versionData);
});

// Get document templates
router.get("/templates", async (req, res) => {
  const templates = await db
    .select({
      id: documentTemplates.id,
      name: documentTemplates.name,
      description: documentTemplates.description,
      category: documentTemplates.category,
    })
    .from(documentTemplates)
    .where(eq(documentTemplates.isActive, true))
    .orderBy(documentTemplates.category, documentTemplates.name);
  
  return res.json(templates);
});

export default router;
