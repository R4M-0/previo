# Previo — Frontend

Collaborative Markdown & LaTeX editor built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Demo credentials

Any email + any password with 6+ characters will work (mock auth).

## Project Structure

```
previo/
├── app/
│   ├── globals.css               # Global styles + font imports
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Redirects to /login
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── signup/
│   │   └── page.tsx              # Signup page with password rules
│   ├── dashboard/
│   │   └── page.tsx              # Dashboard with project grid
│   └── project/[id]/
│       └── page.tsx              # Split-panel editor
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Retractable sidebar with user menu
│   │   └── AppShell.tsx          # App shell wrapping sidebar + content
│   └── ui/
│       ├── NewProjectModal.tsx   # Create project modal
│       └── CollaboratorModal.tsx # Invite collaborators modal
│
├── lib/
│   ├── mock.ts                   # Mock data + formatRelativeDate util
│   └── renderer.ts               # Markdown + LaTeX → HTML renderers
│
├── types/
│   └── index.ts                  # TypeScript types (User, Project, Collaborator)
│
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Key Features

- **Auth pages** — Login & Signup with validation, show/hide password, animated panels
- **Retractable sidebar** — Collapses to icon-only mode, shows recent projects, user menu
- **Dashboard** — Welcome header, quick actions, stats, project grid with format badges
- **Split-panel editor** — Draggable divider to resize editor/preview, Ctrl+S to save
- **Live preview** — Markdown renders ~150ms after typing; LaTeX ~800ms (simulating compile)
- **Collaborator modal** — Shows active users, invite by email
- **Format toggle** — Switch between Markdown and LaTeX mid-document

## Replacing Mock Data

1. Replace `MOCK_USER`, `MOCK_PROJECTS` in `lib/mock.ts` with real API calls
2. Update auth logic in `app/login/page.tsx` and `app/signup/page.tsx`
3. For LaTeX compilation, POST source to your Python service and render the returned PDF/HTML
