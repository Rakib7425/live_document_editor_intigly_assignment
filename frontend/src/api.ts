import axios from "axios";

const API = axios.create({
  baseURL:
    import.meta.env.VITE_APP_API_URL + "/api" || "http://localhost:4000/api",
});

export const AuthAPI = {
  login: (username: string) =>
    API.post("/auth/login", { username }).then(
      (r) => r.data as { id: number; username: string }
    ),
  active: () =>
    API.get("/presence/active").then((r) => r.data as { users: string[] }),
};

export const DocsAPI = {
  list: (q?: string) =>
    API.get("/documents", { params: { q } }).then((r) => r.data as Array<any>),
  create: (title: string, ownerId?: number, ownerUserName?: string) =>
    API.post("/documents", { title, ownerId, ownerUserName }).then(
      (r) =>
        r.data as {
          id: number;
          title: string;
          ownerId?: number;
          ownerUserName?: string;
        }
    ),
  get: (id: number, limit = 50) =>
    API.get(`/documents/${id}`, { params: { limit } }).then(
      (r) => r.data as { doc: any; messages: any[] }
    ),
  update: (id: number, title: string) =>
    API.put(`/documents/${id}`, { title }).then((r) => r.data as any),
  delete: (id: number) =>
    API.delete(`/documents/${id}`).then((r) => r.data as { success: boolean }),
  getVersions: (id: number) =>
    API.get(`/documents/${id}/versions`).then((r) => r.data as Array<any>),
  getVersion: (id: number, version: number) =>
    API.get(`/documents/${id}/versions/${version}`).then((r) => r.data as any),
};
