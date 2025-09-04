import { redis } from "../redis.js";
import { createDocumentVersion } from "./versions.js";

const sessionKey = (docId: number) => `doc:${docId}:session`;
const sessionTtlSeconds = 300; // 5 minutes

interface DocumentSession {
  documentId: number;
  hasEdits: boolean;
  lastEditTime: number;
  originalContent: string;
  currentContent: string;
  createdBy?: number;
}

export async function startDocumentSession(
  documentId: number,
  content: string,
  createdBy?: number
): Promise<void> {
  const session: DocumentSession = {
    documentId,
    hasEdits: false,
    lastEditTime: Date.now(),
    originalContent: content,
    currentContent: content,
    createdBy,
  };

  await redis.setex(
    sessionKey(documentId),
    sessionTtlSeconds,
    JSON.stringify(session)
  );
}

export async function updateDocumentSession(
  documentId: number,
  content: string
): Promise<void> {
  const sessionData = await redis.get(sessionKey(documentId));
  if (!sessionData) return;

  const session: DocumentSession = JSON.parse(sessionData);
  session.hasEdits = true;
  session.lastEditTime = Date.now();
  session.currentContent = content;

  await redis.setex(
    sessionKey(documentId),
    sessionTtlSeconds,
    JSON.stringify(session)
  );
}

export async function endDocumentSession(documentId: number): Promise<void> {
  const sessionData = await redis.get(sessionKey(documentId));
  if (!sessionData) return;

  const session: DocumentSession = JSON.parse(sessionData);

  // Only create a version if there were edits and content changed
  if (session.hasEdits && session.originalContent !== session.currentContent) {
    await createDocumentVersion(
      session.documentId,
      session.currentContent,
      session.createdBy
    );
  }

  // Remove the session
  await redis.del(sessionKey(documentId));
}

export async function getDocumentSession(
  documentId: number
): Promise<DocumentSession | null> {
  const sessionData = await redis.get(sessionKey(documentId));
  if (!sessionData) return null;

  return JSON.parse(sessionData);
}
