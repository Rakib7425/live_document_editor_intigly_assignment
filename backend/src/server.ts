import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import authRouter from "./routes/auth.js";
import docsRouter from "./routes/documents.js";
import presenceRouter from "./routes/presence.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import {
  addPresence,
  removePresence,
  listPresence,
  setCursor,
  getCursors,
} from "./services/presence.js";
import {
  queueDocumentUpdate,
  getDocumentSnapshot,
} from "./services/persistence.js";
import { persistChatMessage } from "./services/chat.js";
import {
  markUserActive,
  markUserInactive,
  heartbeatUser,
} from "./services/presenceGlobal.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/documents", docsRouter);
app.use("/api/presence", presenceRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: "*" },
});

// Redis adapter for scaling
const pubClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

io.on("connection", (socket) => {
  socket.emit("connected", { id: socket.id });

  socket.on("active:login", async ({ username }: { username: string }) => {
    if (!username) return;
    await markUserActive(username, socket.id);
    socket.data.username = username;
  });

  socket.on("active:heartbeat", async () => {
    if (socket.data?.username) {
      await heartbeatUser(socket.data.username, socket.id);
    }
  });

  // Add document presence heartbeat
  socket.on("doc:heartbeat", async ({ docId }: { docId: number }) => {
    if (socket.data?.username && docId) {
      await addPresence(docId, socket.id, socket.data.username);
    }
  });

  socket.on(
    "joinDoc",
    async ({
      docId,
      username,
      userId,
    }: {
      docId: number;
      username: string;
      userId: number;
    }) => {
      if (!docId) return;
      const room = `doc:${docId}`;
      socket.join(room);
      await addPresence(docId, socket.id, username);
      const users = await listPresence(docId);
      const cursors = await getCursors(docId);
      const snapshot = await getDocumentSnapshot(docId);
      io.to(room).emit("presence:update", { type: "join", users });
      socket.emit("cursors:init", cursors);
      socket.emit("doc:snapshot", snapshot);
    }
  );

  socket.on("leaveDoc", async ({ docId }: { docId: number }) => {
    const room = `doc:${docId}`;
    socket.leave(room);
    await removePresence(docId, socket.id);
    const users = await listPresence(docId);
    io.to(room).emit("presence:update", { type: "leave", users });
    io.to(room).emit("cursor:remove", socket.id);
  });

  socket.on(
    "editor:typing",
    ({ docId, username }: { docId: number; username: string }) => {
      const room = `doc:${docId}`;
      socket.to(room).emit("typing", { kind: "editor", username });
    }
  );

  socket.on(
    "cursor",
    async ({
      docId,
      x,
      y,
      isTyping,
    }: {
      docId: number;
      x: number;
      y: number;
      isTyping: boolean;
    }) => {
      if (!socket.data?.username) return;
      const room = `doc:${docId}`;
      await setCursor(docId, socket.id, {
        x,
        y,
        isTyping,
        username: socket.data.username,
      });
      socket.to(room).emit("cursor", {
        userId: socket.id,
        username: socket.data.username,
        x,
        y,
        isTyping,
      });
    }
  );

  socket.on(
    "edit",
    ({
      docId,
      delta,
      version,
      content,
    }: {
      docId: number;
      delta: any;
      version: number;
      content: string;
    }) => {
      const room = `doc:${docId}`;
      socket.to(room).emit("edit", { userId: socket.id, delta, version });
      queueDocumentUpdate({ documentId: docId, content, version });
    }
  );

  socket.on(
    "chat:message",
    async ({
      docId,
      message,
      user,
    }: {
      docId: number;
      message: string;
      user: { id: number; username: string };
    }) => {
      const room = `doc:${docId}`;
      await persistChatMessage({
        documentId: docId,
        authorId: user.id,
        message,
      });
      io.to(room).emit("chat:message", {
        message,
        user,
        createdAt: new Date().toISOString(),
      });
    }
  );

  socket.on(
    "chat:typing",
    ({ docId, username }: { docId: number; username: string }) => {
      const room = `doc:${docId}`;
      socket.to(room).emit("typing", { kind: "chat", username });
    }
  );

  socket.on("disconnect", async () => {
    if (socket.data?.username) {
      await markUserInactive(socket.data.username, socket.id);
    }

    // Clean up presence from all documents this socket was in
    // We need to find which documents this socket was in and remove presence
    // For now, we'll rely on the Redis TTL to clean up stale presence
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
