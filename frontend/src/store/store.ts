import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { AuthAPI } from "../api";

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
    line?: number;
    column?: number;
    isTyping: boolean;
    timestamp?: number;
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
  verifySession: () => Promise<boolean>;
  initializeUser: () => Promise<void>;
};

export const useStore = create<State & Actions>((set, get) => ({
  messages: [],
  docUsers: [],
  cursors: [],
  showCreateModal: false,

  setUser: (u) => {
    set({ user: u });
  },

  logout: async () => {
    const { socket } = get();
    socket?.close();
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    const state = get();
    if (state.socket) return;

    const s = io(import.meta.env.VITE_APP_API_URL || "http://localhost:4000", {
      withCredentials: true
    });

    s.on("connect", () => {
      const currentUser = get().user;
      if (currentUser) {
        s.emit("active:login", { username: currentUser.username });
      }
    });

    s.on("chat:message", (m) => {
      const currentMessages = get().messages;
      set({ messages: [...currentMessages, m] });
    });

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
        line?: number;
        column?: number;
        isTyping: boolean;
      }) => {
        set((state) => {
          const safeCursors = Array.isArray(state.cursors) ? state.cursors : [];
          const filteredCursors = safeCursors.filter(
            (c) => c.userId !== cursorData.userId
          );
          return {
            cursors: [
              ...filteredCursors,
              {
                ...cursorData,
                timestamp: Date.now()
              }
            ]
          };
        });
      }
    );

    s.on("cursor:remove", (userId: string) => {
      set((state) => ({
        cursors: Array.isArray(state.cursors) 
          ? state.cursors.filter((c) => c.userId !== userId)
          : []
      }));
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

  verifySession: async () => {
    try {
      const user = await AuthAPI.verify();
      set({ user });
      return true;
    } catch (error) {
      console.log('No valid session found');
      return false;
    }
  },

  initializeUser: async () => {
    const { verifySession, connectSocket } = get();
    const hasValidSession = await verifySession();
    if (hasValidSession) {
      connectSocket();
    }
  },
}));
