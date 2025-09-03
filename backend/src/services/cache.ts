import { redis } from "../redis.js";

const docKey = (id: number) => `doc:${id}:snapshot`;
const ttlSeconds = 30;

export async function getCachedDocument(
  id: number
): Promise<{ content: string; version: number } | null> {
  const json = await redis.get(docKey(id));
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function setCachedDocument(
  id: number,
  snapshot: { content: string; version: number }
): Promise<void> {
  await redis.set(docKey(id), JSON.stringify(snapshot), "EX", ttlSeconds);
}

export async function invalidateDocument(id: number): Promise<void> {
  await redis.del(docKey(id));
}
