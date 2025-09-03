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
  cursors: Record<string, any>;
  messages: Array<{
    id?: number;
    message: string;
    createdAt: string;
    user: { id: number; username: string };
  }>;
  docUsers: Array<{ id: string; username: string }>;
  showCreateModal: boolean;
};

type Actions = {
  setUser: (u: User) => void;
  logout: () => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
  setCurrentDoc: (d?: Doc) => void;
  setCursors: (c: Record<string, any>) => void;
  addMessage: (m: State["messages"][number]) => void;
  clearMessages: () => void;
  setShowCreateModal: (show: boolean) => void;
};

export const useStore = create<State & Actions>((set, get) => ({
  cursors: {},
  messages: [],
  docUsers: [],
  showCreateModal: false,
  setUser: (u) => set({ user: u }),
  logout: () => {
    const { socket } = get();
    socket?.close();
    set({
      user: undefined,
      socket: undefined,
      currentDoc: undefined,
      cursors: {},
      messages: [],
      docUsers: [],
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
    s.on("cursors:init", (c) => set({ cursors: c }));
    s.on("cursor", ({ userId, username, cursor }) =>
      set({ cursors: { ...get().cursors, [userId]: { ...cursor, username } } })
    );
    s.on("cursor:remove", ({ userId }) => {
      const { cursors } = get();
      const newCursors = { ...cursors };
      delete newCursors[userId];
      set({ cursors: newCursors });
    });
    s.on("chat:message", (m) => set({ messages: [...get().messages, m] }));
    s.on(
      "presence:update",
      (p: { type: string; users: Array<{ id: string; username: string }> }) => {
        if (Array.isArray(p.users)) set({ docUsers: p.users });
      }
    );
    s.on("typing", (t) => {
      // Could extend store to show typing banners; for now no-op here.
    });
    set({ socket: s });
  },
  disconnectSocket: () => {
    const { socket } = get();
    socket?.close();
    set({ socket: undefined });
  },
  setCurrentDoc: (d) => set({ currentDoc: d }),
  setCursors: (c) => set({ cursors: c }),
  addMessage: (m) => set({ messages: [...get().messages, m] }),
  clearMessages: () => set({ messages: [] }),
  setShowCreateModal: (show) => set({ showCreateModal: show }),
}));
