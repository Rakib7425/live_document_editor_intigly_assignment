### Live Document Editor (Full‑stack)

Collaborative real‑time document editor with presence, chat, and version history.

- Frontend: React 19, Vite, TypeScript, Zustand, Socket.IO client, Tailwind CSS
- Backend: Node.js/Express, Socket.IO, Drizzle ORM, Postgres, Redis

Both apps live in this repo:

- `frontend/` – React SPA
- `backend/` – REST + WebSocket server, persistence, presence, versions

---

## Prerequisites

- Node.js 18+ and Yarn
- Docker (optional, for local Postgres/Redis)

---

## Quick Start

1. Start Postgres and Redis (Docker, optional but recommended):

```bash
cd backend
docker compose up -d
```

2. Configure env (defaults work out‑of‑the‑box):

- Backend defaults:

  - `PORT=4000`
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/rtc_docs`
  - `REDIS_URL=redis://redisuser:redispass123@localhost:6379`

- Frontend:
  - `VITE_APP_API_URL=http://localhost:4000`

Create `.env` files if you want to override defaults:

```bash
# backend/.env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rtc_docs
REDIS_URL=redis://localhost:6379

# frontend/.env
VITE_APP_API_URL=http://localhost:4000
```

3. Install deps and run dev:

```bash
# backend
cd backend
yarn
yarn dev

# frontend (in another terminal)
cd frontend
yarn
yarn dev
```

- Backend runs on `http://localhost:4000`
- Frontend runs on `http://localhost:5173`

---

## Backend

Location: `backend/`

### Tech

- Express 5, Socket.IO
- Drizzle ORM with Postgres
- Redis for presence and Socket.IO adapter

### Scripts

```bash
yarn dev         # Start dev server with tsx watch
yarn build       # TypeScript build to dist/
yarn start       # Run compiled server
yarn studio      # Drizzle Studio (schema explorer)
yarn db:repair   # Generate/migrate/push/pull/check with drizzle-kit
```

### Environment

- `PORT` – HTTP server port (default 4000)
- `DATABASE_URL` – Postgres connection string
- `REDIS_URL` – Redis connection string

### REST API

Base URL: `http://localhost:4000/api`

- Auth
  - `POST /auth/login` – body `{ username }` → `{ id, username }`
- Presence
  - `GET /presence/active` → `{ users: string[] }`
- Documents
  - `GET /documents?q=...` → list with `activeCount`
  - `POST /documents` – `{ title, ownerId?, ownerUserName? }` → `{ id, title, ... }`
  - `GET /documents/:id?limit=50` → `{ doc, messages }`
  - `PUT /documents/:id` – `{ title }` → updated doc
  - `DELETE /documents/:id` → `{ success: true }`
  - `GET /documents/:id/versions` → version list
  - `GET /documents/:id/versions/:version` → specific version

### Socket.IO Events

- Client → Server

  - `active:login` `{ username }`
  - `active:heartbeat`
  - `doc:heartbeat` `{ docId }`
  - `joinDoc` `{ docId, username, userId }`
  - `leaveDoc` `{ docId }`
  - `cursor` `{ docId, x, y, isTyping }`
  - `editor:typing` `{ docId, username }`
  - `chat:message` `{ docId, message, user }`
  - `chat:typing` `{ docId, username }`

- Server → Client
  - `connected` `{ id }`
  - `presence:update` `{ type, users }`
  - `cursors:init` `[{ userId, username, x, y, isTyping }]`
  - `cursor` `{ userId, username, x, y, isTyping }`
  - `cursor:remove` `userId`
  - `doc:snapshot` `{ content, version, ... }`
  - `edit` `{ userId, content, version }`
  - `chat:message` `{ message, user, createdAt }`
  - `typing` `{ kind, username }`
  - `document:created|updated|deleted` events

---

## Frontend

Location: `frontend/`

### Tech

- React 19 + Vite
- Zustand for state
- Axios for REST
- Socket.IO client for realtime
- Tailwind CSS

### Scripts

```bash
yarn dev       # Start Vite dev server
yarn build     # Type-check and build
yarn preview   # Preview production build
yarn lint      # Lint codebase
```

### Environment

- `VITE_APP_API_URL` – backend base URL (e.g. `http://localhost:4000`)

### Features

- Login by username
- Create, list, search, rename, delete documents
- Live presence (active users, cursors, typing)
- In-doc chat with typing indicators
- Version history and restore view

---

## Local Development Tips

- If using Docker, ensure containers are healthy before starting the backend.
- First run may need DB objects; the app creates tables via Drizzle. If schema drifts, run `yarn db:repair` in `backend/`.
- CORS is open (`*`) in dev; set a stricter origin for production.

---

## Deployment (outline)

1. Provision Postgres and Redis.
2. Build and run backend:

```bash
cd backend
yarn install
yarn build
node dist/server.js
```

3. Configure env vars on the server for `PORT`, `DATABASE_URL`, `REDIS_URL`.
4. Build and host frontend:

```bash
cd frontend
yarn install
yarn build
# serve frontend/dist via your static host or reverse proxy
```

5. Set `VITE_APP_API_URL` at build time to point to your backend URL.

---

## Troubleshooting

- Backend cannot connect to DB: verify `DATABASE_URL` and that Postgres is reachable.
- Redis errors: ensure Redis is running and `REDIS_URL` is correct.
- Realtime not working: check that frontend uses the correct `VITE_APP_API_URL` and port 4000 is accessible.
- CORS errors: configure backend `cors` options with your frontend origin in production.

---

```sql
CREATE TABLE public.document_templates (
id SERIAL PRIMARY KEY,
name VARCHAR(256) NOT NULL,
description TEXT,
content TEXT NOT NULL DEFAULT '',
category VARCHAR(64) DEFAULT 'General',
is_active BOOLEAN DEFAULT true,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

```sql
INSERT INTO document_templates
(id, name, description, content, category, is_active, created_at, updated_at)
VALUES
(1, 'Blank Document', 'Start from scratch with a clean document', '', 'General', TRUE, '2025-09-07 00:14:15.132526', '2025-09-07 00:14:15.132526'),
(2, 'Meeting Notes', 'Template for meeting minutes and action items',
'# Meeting Notes

**Date:** 7/9/2025
**Attendees:**

## Agenda

## Discussion Points

## Action Items

## Next Steps
', 'Business', TRUE, '2025-09-07 00:14:15.142666', '2025-09-07 00:14:15.142666'),
(3, 'Project Plan', 'Organize project goals, timeline, and deliverables',
'# Project Plan

## Overview

## Objectives

## Timeline

## Deliverables

## Resources

## Risk Assessment
', 'Business', TRUE, '2025-09-07 00:14:15.150668', '2025-09-07 00:14:15.150668'),
(4, 'Technical Documentation', 'Document APIs, processes, or technical specifications',
'# Technical Documentation

## Overview

## Prerequisites

## Installation

## Usage

## API Reference

## Examples

## Troubleshooting
', 'Technical', TRUE, '2025-09-07 00:14:15.157536', '2025-09-07 00:14:15.157536'),
(5, 'Task Checklist', 'Create organized to-do lists and checklists',
'# Task Checklist

## Today
- [ ]
- [ ]

## This Week
- [ ]
- [ ]

## Completed
- [x] Example completed task
', 'Productivity', TRUE, '2025-09-07 00:14:15.165619', '2025-09-07 00:14:15.165619'),
(6, 'Creative Writing', 'Perfect for stories, articles, and creative content',
'# Creative Writing

## Inspiration

## Outline

## Draft

## Notes
', 'Creative', TRUE, '2025-09-07 00:14:15.172029', '2025-09-07 00:14:15.172029');

```
