# Previo

Collaborative Markdown + LaTeX writing platform with:
- real authentication (email/password + Google + GitHub OAuth)
- PostgreSQL-backed projects and collaboration
- live preview/rendering (Markdown + LaTeX)
- version history with revert
- invitation workflow (accept/deny)
- save comments in version history
- near-real-time collaborator sync (no manual refresh on saved updates)

## Project Structure

```text
previo/
├── backend/
│   ├── db/
│   │   └── postgres_service.py    # PostgreSQL data/auth/collab/version logic
│   ├── latex/
│   │   ├── latex_preview.py       # LaTeX -> preview payload (PDF data URL)
│   │   └── latex_renderer.py      # LaTeX -> downloadable PDF
│   ├── markdown/
│   │   ├── markdown_preview.py    # Markdown -> preview payload
│   │   └── markdown_renderer.py   # Markdown -> downloadable HTML
│   └── requirements.txt
└── ui/
    ├── app/                       # Next.js app routes + API routes
    ├── components/                # UI components
    ├── lib/                       # server/client utilities
    ├── types/                     # shared TS types
    └── package.json
```

## Requirements

- Node.js 18+
- npm
- Python 3.10+
- PostgreSQL 14+ (or Docker Compose service)
- LaTeX compiler (`pdflatex`) available in PATH
- Docker + Docker Compose (optional)

## Setup

### 1. Backend Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Frontend dependencies

```bash
cd ui
npm install
```

### 3. Environment variables

Create root `.env` (used by Docker Compose):

```env
POSTGRES_DB=previo
POSTGRES_USER=previo
POSTGRES_PASSWORD=previo
PREVIO_DATABASE_URL=postgresql://previo:previo@postgres:5432/previo
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For local non-Docker UI runs, create `ui/.env.local`:

```env
# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# App URL (used for OAuth callback URL construction)
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# DB connection used by backend scripts
PREVIO_DATABASE_URL=postgresql://previo:previo@postgres:5432/previo
```

## Run

```bash
cd ui
npm run dev
```

Open `http://localhost:3000`.

## Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:3000`.

Notes:
- The UI container runs Next.js and invokes Python backend scripts locally.
- PostgreSQL data is persisted in the `postgres_data` Docker volume.

## OAuth Callback URLs

Configure these in provider dashboards:

- Google: `http://localhost:3000/api/auth/oauth/google/callback`
- GitHub: `http://localhost:3000/api/auth/oauth/github/callback`

## Main Features

- Auth:
  - Email/password signup/login
  - Google and GitHub OAuth
  - Session cookie auth
- Projects:
  - Create/edit markdown and latex docs
  - Search projects by title/content/format
  - Delete owned projects from dashboard
- Collaboration:
  - Invite by email
  - Recipient receives invite notification
  - Accept/Deny invite
  - Shared project access for accepted members
  - Auto-sync of saved changes in open collaborator editors
- Version Control:
  - Version snapshot on project updates
  - Optional save comment shown in history entries
  - History panel showing who/when/what changed
  - Unified diff view
  - Revert to any previous version
- Rendering:
  - Markdown preview/render via Python backend
  - LaTeX preview/render via Python backend (`pdflatex`)
- Theming:
  - System-based light/dark by default
  - User override: System / Light / Dark

## Notes

- If you change DB schema logic, restart the app and re-run flows to verify migration paths.
- Rotate OAuth secrets if they were shared in plain text.
- For production images, `ui/next.config.js` is configured with `output: "standalone"`.
