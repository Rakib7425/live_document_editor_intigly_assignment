import { redis } from "../redis.js";

const ACTIVE_USERS_SET = "presence:active:users";
const USER_SOCKET_KEY = (username: string, socketId: string) =>
  `presence:active:${username}:${socketId}`;
const TTL_SECONDS = 40;

export async function markUserActive(
  username: string,
  socketId: string
): Promise<void> {
  await redis.sadd(ACTIVE_USERS_SET, username);
  await redis.set(USER_SOCKET_KEY(username, socketId), "1", "EX", TTL_SECONDS);
}

export async function heartbeatUser(
  username: string,
  socketId: string
): Promise<void> {
  await redis.expire(USER_SOCKET_KEY(username, socketId), TTL_SECONDS);
}

export async function markUserInactive(
  username: string,
  socketId: string
): Promise<void> {
  await redis.del(USER_SOCKET_KEY(username, socketId));
  // Check if user has any other active sockets
  const keys = await redis.keys(`presence:active:${username}:*`);
  if (keys.length === 0) {
    await redis.srem(ACTIVE_USERS_SET, username);
  }
}

export async function listActiveUsers(): Promise<string[]> {
  return await redis.smembers(ACTIVE_USERS_SET);
}
