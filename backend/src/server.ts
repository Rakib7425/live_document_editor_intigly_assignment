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
  setCursor,
  listPresence,
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
const io = new Server(server, {
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
      const cursors = await (async () => {
        try {
          return await import("./services/presence.js").then((m) =>
            m.getCursors(docId)
          );
        } catch {
          return {};
        }
      })();
      const snapshot = await getDocumentSnapshot(docId);
      io.to(room).emit("presence:update", { type: "join", users });
      socket.emit("doc:snapshot", snapshot);
      socket.emit("cursors:init", cursors);
    }
  );

  socket.on("leaveDoc", async ({ docId }: { docId: number }) => {
    const room = `doc:${docId}`;
    socket.leave(room);
    await removePresence(docId, socket.id);
    const users = await listPresence(docId);
    io.to(room).emit("presence:update", { type: "leave", users });
    io.to(room).emit("cursor:remove", { userId: socket.id });
  });

  socket.on(
    "cursor",
    async ({ docId, cursor }: { docId: number; cursor: any }) => {
      const room = `doc:${docId}`;
      await setCursor(docId, socket.id, cursor);

      // Get the username for this socket
      const presence = await listPresence(docId);
      const user = presence.find((u) => u.id === socket.id);
      const username = user?.username || "Unknown";

      socket.to(room).emit("cursor", {
        userId: socket.id,
        username,
        cursor,
      });
    }
  );

  socket.on(
    "editor:typing",
    ({ docId, username }: { docId: number; username: string }) => {
      const room = `doc:${docId}`;
      socket.to(room).emit("typing", { kind: "editor", username });
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
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
