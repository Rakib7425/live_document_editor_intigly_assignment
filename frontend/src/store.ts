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
    x: number;
    y: number;
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

  setUser: (u) => set({ user: u }),

  logout: () => {
    const { socket } = get();
    socket?.close();
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

    const s = io("http://localhost:4000");

    s.on("connect", () => {
      if (user) s.emit("active:login", { username: user.username });
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
      (editData: { userId: string; delta: any; version: number }) => {
        window.dispatchEvent(
          new CustomEvent("document:edit", { detail: editData })
        );
      }
    );

    s.on("cursors:init", (cursors: State["cursors"]) => {
      set({ cursors: Array.isArray(cursors) ? cursors : [] });
    });

    s.on(
      "cursor",
      (cursorData: {
        userId: string;
        username: string;
        x: number;
        y: number;
        isTyping: boolean;
      }) => {
        const { cursors } = get();
        const safeCursors = Array.isArray(cursors) ? cursors : [];
        const updatedCursors = safeCursors.filter(
          (c) => c.userId !== cursorData.userId
        );
        if (cursorData.isTyping) {
          updatedCursors.push(cursorData);
        }
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
