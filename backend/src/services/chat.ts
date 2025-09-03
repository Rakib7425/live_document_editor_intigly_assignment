import { db } from "../db/client.js";
import { chatMessages } from "../db/schema.js";

export async function persistChatMessage(params: {
  documentId: number;
  authorId: number;
  message: string;
}) {
  const { documentId, authorId, message } = params;
  await db.insert(chatMessages).values({ documentId, authorId, message });
}
