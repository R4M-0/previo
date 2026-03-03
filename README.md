
<h1 align="center">Previo</h1>

<p align="center">
  Collaborative Markdown + LaTeX writing platform
</p>

<p align="center">
  <a href="https://github.com/R4M-0/previo">
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" />
  </a>
  <a href="https://github.com/R4M-0/previo">
    <img src="https://img.shields.io/github/stars/R4M-0/previo?style=social" />
  </a>
</p>

---

## ☕ Support the Project

If you find **Previo** useful and want to support its development:

👉 https://buymeacoffee.com/r4m0  

Your support helps maintain and improve the platform ❤️

---

## Highlights

- Authentication: Email/password + Google/GitHub OAuth
- Projects: Markdown/LaTeX editing, import `.md`/`.tex`, search, delete
- Collaboration: Invite by email, accept/deny workflow, shared access
- Versioning: Snapshot history, diff view, save comments, revert
- Rendering: Markdown preview/export + LaTeX preview/export (PDF)
- Workspace: Per-project file/image uploads accessible from LaTeX
- CLI: Cross-platform `previo start <port>` / `previo stop`

## Screenshots

### Auth

![Login](./screenshots/login.png)

### Dashboard

![Dashboard](./screenshots/dashboard.png)

### New Project

![New Project](./screenshots/new_project.png)

### Import Project

![Import Project](./screenshots/import_project.png)

### Project Editor

![Project](./screenshots/project.png)

### Collaboration

![Collaboration](./screenshots/collaboration.png)

### Version History

![Version History](./screenshots/version_history.png)

### Project Workspace

![Workspace](./screenshots/workspace.png)

## Project Structure

```text
previo/
├── backend/
│   ├── db/postgres_service.py
│   ├── latex/
│   ├── markdown/
│   └── requirements.txt
├── ui/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── package.json
├── screenshots/
├── bin/previo.js
└── package.json
````

## Requirements

* Node.js 18+
* npm
* Python 3.10+
* PostgreSQL 14+ (or Docker Compose)
* LaTeX compiler (`pdflatex`)
* Docker + Docker Compose (recommended for full stack)

## Quick Start (Recommended)

1. Configure `.env` at repo root:

```env
POSTGRES_DB=previo
POSTGRES_USER=previo
POSTGRES_PASSWORD=previo
PREVIO_DATABASE_URL=postgresql://previo:previo@postgres:5432/previo
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

2. Install the CLI once:

```bash
npm link
```

3. Start app:

```bash
previo start 3000
```

4. Stop app:

```bash
previo stop
```

## Local Development (Without CLI)

### UI dependencies

```bash
cd ui
npm install
```

### Python dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Run dev server

```bash
cd ui
npm run dev
```

Open `http://localhost:3000`.

## Docker Notes

* `docker compose up` uses `docker-compose.override.yml` (dev mode with bind mounts)
* `docker compose -f docker-compose.yml up --build` uses production image
* Workspace files are persisted in `workspaces_data` and available under `PREVIO_WORKSPACES_DIR`

## OAuth Callback URLs

* Google: `http://localhost:3000/api/auth/oauth/google/callback`
* GitHub: `http://localhost:3000/api/auth/oauth/github/callback`

Use a consistent host (`localhost` recommended).

## Main Features

### Auth

* Signup/login with email/password
* Google OAuth
* GitHub OAuth
* Session cookie auth

### Projects

* Create Markdown or LaTeX projects
* Import existing `.md` / `.tex`
* Search by title/content/format
* Delete owned projects

### Collaboration

* Invite collaborators by email
* Accept or deny invitations
* Shared editing access for accepted members
* Remote save sync in open editors

### Versioning

* Auto snapshot on save
* Optional save comments
* Diff viewer for each version
* Revert to any previous snapshot

### Rendering

* Markdown preview + HTML export
* LaTeX preview + PDF export

### Workspace

* Per-project file storage
* Upload/list/open/delete files
* Use workspace image URLs directly in LaTeX `\\includegraphics{...}`

## License

This project is licensed under the MIT License.
See the `LICENSE` file for details.

## Additional Docs

* UI: [`ui/README.md`](./ui/README.md)
* Backend: [`backend/README.md`](./backend/README.md)


