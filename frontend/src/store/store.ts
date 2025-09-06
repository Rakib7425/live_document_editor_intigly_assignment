import { create } from "zustand";
import { io, Socket } from "socket.io-client";

export type User = { id: number; username: string };
export type Doc = {
  id: number;
  title: string;
  updatedAt: string;
  activeCount?: number;
  content?: string;
  version?: number;
  ownerId?: number;
  ownerUserName?: string;
  createdAt?: string;
};

type State = {
  user?: User;
  socket?: Socket;
  currentDoc?: Doc;
  messages: Array<{
    id?: number;
    message: string;
    createdAt: string;
    user: { id: number; username: string };
  }>;
  docUsers: Array<{ id: string; username: string }>;
  cursors: Array<{
    userId: string;
    username: string;
    x?: number;
    y?: number;
    index?: number;
    isTyping: boolean;
  }>;
  showCreateModal: boolean;
};

type Actions = {
  setUser: (u: User) => void;
  logout: () => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
  setCurrentDoc: (d?: Doc) => void;
  addMessage: (m: State["messages"][number]) => void;
  clearMessages: () => void;
  setShowCreateModal: (show: boolean) => void;
  setCursors: (cursors: State["cursors"]) => void;
};

export const useStore = create<State & Actions>((set, get) => ({
  messages: [],
  docUsers: [],
  cursors: [],
  showCreateModal: false,

  setUser: (u) => {
    try {
      localStorage.setItem("live_docs_user", JSON.stringify(u));
    } catch {}
    set({ user: u });
  },
  // Persist user in localStorage for reloads
  // Restore on app start happens in main/App via reading localStorage (added below)

  logout: () => {
    const { socket } = get();
    socket?.close();
    try {
      localStorage.removeItem("live_docs_user");
    } catch {}
    set({
      user: undefined,
      socket: undefined,
      currentDoc: undefined,
      messages: [],
      docUsers: [],
      cursors: [],
      showCreateModal: false,
    });
  },

  connectSocket: () => {
    const { socket, user } = get();
    if (socket) return;

    const s = io(import.meta.env.VITE_APP_API_URL || "http://localhost:4000");

    s.on("connect", () => {
      let u = user;
      if (!u) {
        try {
          const raw = localStorage.getItem("live_docs_user");
          if (raw) u = JSON.parse(raw);
        } catch {}
        if (u) set({ user: u });
      }
      if (u) s.emit("active:login", { username: u.username });
    });

    s.on("chat:message", (m) => set({ messages: [...get().messages, m] }));

    s.on(
      "presence:update",
      (p: { type: string; users: Array<{ id: string; username: string }> }) => {
        if (Array.isArray(p.users)) set({ docUsers: p.users });
      }
    );

    s.on("typing", () => {
      // could extend to show typing indicators
    });

    s.on("document:created", (newDoc: any) => {
      window.dispatchEvent(
        new CustomEvent("document:created", { detail: newDoc })
      );
    });

    s.on(
      "edit",
      (editData: {
        userId: string;
        delta: any;
        version: number;
        content: string;
        operations?: any[];
        baseContent?: string;
      }) => {
        window.dispatchEvent(
          new CustomEvent("document:edit", { detail: editData })
        );
      }
    );

    s.on("cursors:init", (cursors: any) => {
      // Normalize object-incoming payloads into array if needed
      const normalized = Array.isArray(cursors)
        ? cursors
        : Object.entries(cursors || {}).map(([userId, cur]: any) => ({
            userId,
            username: cur?.username ?? "Unknown",
            x: cur?.x,
            y: cur?.y,
            index: cur?.index,
            isTyping: !!cur?.isTyping,
          }));
      set({ cursors: normalized });
    });

    s.on(
      "cursor",
      (cursorData: {
        userId: string;
        username: string;
        x?: number;
        y?: number;
        index?: number;
        isTyping: boolean;
      }) => {
        const { cursors } = get();
        const safeCursors = Array.isArray(cursors) ? cursors : [];
        const updatedCursors = safeCursors.filter(
          (c) => c.userId !== cursorData.userId
        );
        // Always add cursor data, regardless of typing status
        updatedCursors.push(cursorData);
        set({ cursors: updatedCursors });
      }
    );

    s.on("cursor:remove", (userId: string) => {
      const { cursors } = get();
      const safeCursors = Array.isArray(cursors) ? cursors : [];
      set({ cursors: safeCursors.filter((c) => c.userId !== userId) });
    });

    s.on("document:updated", (updateData: { id: number; title: string }) => {
      window.dispatchEvent(
        new CustomEvent("document:updated", { detail: updateData })
      );
    });

    s.on("document:deleted", (deleteData: { id: number }) => {
      window.dispatchEvent(
        new CustomEvent("document:deleted", { detail: deleteData })
      );
    });

    set({ socket: s });
  },

  disconnectSocket: () => {
    const { socket } = get();
    socket?.close();
    set({ socket: undefined });
  },

  setCurrentDoc: (d) => set({ currentDoc: d }),

  addMessage: (m) => set({ messages: [...get().messages, m] }),

  clearMessages: () => set({ messages: [] }),

  setShowCreateModal: (show) => set({ showCreateModal: show }),

  setCursors: (cursors) =>
    set({ cursors: Array.isArray(cursors) ? cursors : [] }),
}));
