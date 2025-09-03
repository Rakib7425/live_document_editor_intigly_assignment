import { db } from "../db/client.js";
import { documents } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { invalidateDocument, setCachedDocument } from "./cache.js";

type PendingUpdate = {
  documentId: number;
  content: string;
  version: number;
};

const debounceMs = 500;
const timers = new Map<number, NodeJS.Timeout>();
const latest = new Map<number, PendingUpdate>();

export function queueDocumentUpdate(update: PendingUpdate): void {
  latest.set(update.documentId, update);
  const existing = timers.get(update.documentId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    const u = latest.get(update.documentId);
    if (!u) return;
    await db
      .update(documents)
      .set({ content: u.content, version: u.version, updatedAt: new Date() })
      .where(eq(documents.id, u.documentId));
    await invalidateDocument(u.documentId);
    await setCachedDocument(u.documentId, {
      content: u.content,
      version: u.version,
    });
    latest.delete(u.documentId);
    timers.delete(u.documentId);
  }, debounceMs);
  timers.set(update.documentId, t);
}

export async function getDocumentSnapshot(
  documentId: number
): Promise<{ content: string; version: number } | null> {
  // Prefer cached snapshot if available
  try {
    const { getCachedDocument } = await import("./cache.js");
    const cached = await getCachedDocument(documentId);
    if (cached) return cached;
  } catch {}
  const row = (
    await db
      .select({ content: documents.content, version: documents.version })
      .from(documents)
      .where(eq(documents.id, documentId))
  ).at(0);
  if (!row) return null;
  return row;
}
