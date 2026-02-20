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
```

Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main UI Features

- Auth:
  - Email/password login and signup
  - Google and GitHub OAuth
- Dashboard:
  - Project list + search
  - Invitation notifications with Accept/Deny
  - Detailed writing stats
- Editor:
  - Markdown/LaTeX source + preview
  - Download render (HTML/PDF)
  - Version history + diff + revert
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
  - `/api/invitations`
  - `/api/markdown/*`
  - `/api/latex/*`

## Auth Protection

`ui/middleware.ts` protects app routes and redirects unauthenticated users to `/login`.

## Notes

- UI depends on Python backend scripts in `../backend`.
- Restart dev server after changing `.env.local`.

