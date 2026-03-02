# Previo UI

Next.js frontend for Previo (collaborative Markdown + LaTeX editor).

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS

## Setup

```bash
cd ui
npm install
```

Create `ui/.env.local`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
PREVIO_DATABASE_URL=postgresql://previo:previo@localhost:5432/previo
```

Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Docker

The recommended container flow is from repo root:

```bash
docker compose up --build
```

Notes:
- `ui/Dockerfile` builds Next.js in standalone mode and runs Node + Python + LaTeX tooling in one container.
- Backend scripts are mounted at `/app/backend` and called by API routes.
- Docker Compose reads DB and OAuth credentials from root `.env`.

## Main UI Features

- Auth:
  - Email/password login and signup
  - Google and GitHub OAuth
- Dashboard:
  - Project list + search
  - New project import from `.md` / `.tex`
  - Invitation notifications with Accept/Deny
  - Detailed writing stats
  - Delete owned projects
- Editor:
  - Markdown/LaTeX source + preview
  - Project workspace modal (upload/list/delete/open/copy file URL)
  - Download render (HTML/PDF)
  - Version history + diff + revert
  - Optional save comment before saving (stored in history)
  - Auto-sync of remote saved updates without page refresh
- Collaboration:
  - Invite collaborators by email
  - Shared project access after invite acceptance
- Theme:
  - System-based default theme
  - User override in profile (System/Light/Dark)

## Important Routes

- Pages:
  - `/login`
  - `/signup`
  - `/dashboard`
  - `/project/[id]`
  - `/profile`
- API:
  - `/api/auth/*`
  - `/api/projects/*`
  - `/api/projects/import`
  - `/api/projects/[id]/workspace`
  - `/api/projects/[id]/workspace/file`
  - `/api/invitations`
  - `/api/markdown/*`
  - `/api/latex/*`

## Auth Protection

`ui/middleware.ts` protects app routes and redirects unauthenticated users to `/login`.

## Notes

- UI depends on Python backend scripts in `../backend`.
- Workspace files are persisted under `PREVIO_WORKSPACES_DIR` (default local path: `ui/.workspaces`).
- Restart dev server after changing `.env.local`.
- Next 15 note: pages using `useSearchParams` must be wrapped in a Suspense boundary (already applied for `/login`).
- For OAuth, use one host consistently (`http://localhost:3000` recommended).
