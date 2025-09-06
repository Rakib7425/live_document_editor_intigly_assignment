import { db } from "../db/client.js";
import { documentVersions, documents } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

export async function createDocumentVersion(
  documentId: number,
  content: string,
  createdBy?: number
): Promise<void> {
  // Get the current version number
  const currentDoc = (
    await db.select().from(documents).where(eq(documents.id, documentId))
  )[0];

  if (!currentDoc) return;

  const newVersion = (currentDoc.version || 0) + 1;

  // Create the version record
  await db.insert(documentVersions).values({
    documentId,
    content,
    version: newVersion,
    createdBy,
  });

  // Update the document's version number
  await db
    .update(documents)
    .set({ version: newVersion })
    .where(eq(documents.id, documentId));
}

export async function getDocumentVersions(documentId: number): Promise<
  Array<{
    id: number;
    content: string;
    version: number;
    createdAt: Date;
    createdBy?: number;
  }>
> {
  const result = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version));

  return result.map((row) => ({
    id: row.id,
    content: row.content,
    version: row.version,
    createdAt: row.createdAt,
    ...(row.createdBy !== null && { createdBy: row.createdBy }),
  }));
}

export async function getDocumentVersion(
  documentId: number,
  version: number
): Promise<{
  id: number;
  content: string;
  version: number;
  createdAt: Date;
  createdBy?: number;
} | null> {
  const result = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.version, version)
      )
    )
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    id: row.id,
    content: row.content,
    version: row.version,
    createdAt: row.createdAt,
    ...(row.createdBy !== null && { createdBy: row.createdBy }),
  };
}
