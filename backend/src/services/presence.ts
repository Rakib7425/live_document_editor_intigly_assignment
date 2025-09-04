import { redis } from "../redis.js";

const presenceSet = (docId: number) => `doc:${docId}:presence`;
const cursorHash = (docId: number) => `doc:${docId}:cursors`;
const cursorTtlSeconds = 30;

export async function addPresence(
  docId: number,
  userId: string,
  username: string
): Promise<void> {
  await redis.hset(presenceSet(docId), userId, username);
  await redis.expire(presenceSet(docId), 300); // 5 minutes TTL
}

export async function removePresence(
  docId: number,
  userId: string
): Promise<void> {
  await redis.hdel(presenceSet(docId), userId);
  await redis.hdel(cursorHash(docId), userId);
}

export async function listPresence(
  docId: number
): Promise<Array<{ id: string; username: string }>> {
  const map = await redis.hgetall(presenceSet(docId));
  return Object.entries(map).map(([id, username]) => ({ id, username }));
}

export async function setCursor(
  docId: number,
  userId: string,
  cursor: unknown
): Promise<void> {
  await redis.hset(cursorHash(docId), userId, JSON.stringify(cursor));
  await redis.expire(cursorHash(docId), cursorTtlSeconds);
}

export async function getCursors(
  docId: number
): Promise<Record<string, unknown>> {
  const map = await redis.hgetall(cursorHash(docId));
  const presence = await redis.hgetall(presenceSet(docId));
  const result: Record<string, unknown> = {};

  for (const [id, json] of Object.entries(map)) {
    try {
      const cursor = JSON.parse(json);
      const username = presence[id] || "Unknown";
      result[id] = { ...cursor, username };
    } catch {}
  }
  return result;
}

export async function countPresence(docId: number): Promise<number> {
  return await redis.hlen(presenceSet(docId));
}

export async function countPresenceForDocs(
  docIds: number[]
): Promise<Record<number, number>> {
  const pipeline = redis.pipeline();
  for (const id of docIds) pipeline.hlen(presenceSet(id));
  const results = await pipeline.exec();
  const counts: Record<number, number> = {};
  let i = 0;
  for (const id of docIds) {
    const [, value] = results[i++] ?? [];
    counts[id] = typeof value === "number" ? value : 0;
  }
  return counts;
}
