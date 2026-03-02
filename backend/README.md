# Previo Backend

Python backend services used by the Next.js UI.

## What’s here

- `db/postgres_service.py`
  - PostgreSQL data layer and auth/collaboration/version logic
  - Exposed through UI API routes (the UI spawns this script)
- `markdown/markdown_preview.py`
  - Markdown -> preview payload (HTML JSON)
- `markdown/markdown_renderer.py`
  - Markdown -> downloadable HTML file
- `latex/latex_preview.py`
  - LaTeX -> preview payload (base64/data-url PDF)
- `latex/latex_renderer.py`
  - LaTeX -> downloadable PDF file
## Requirements

- Python 3.10+
- PostgreSQL 14+
- LaTeX compiler (`pdflatex`) for LaTeX render/preview
- `PREVIO_DATABASE_URL` (or `DATABASE_URL`) environment variable for DB access

Install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## PostgreSQL Service Usage

General form:

```bash
python3 backend/db/postgres_service.py --action <action> --stdin
```

Example:

```bash
echo '{"email":"omar@previo.app","password":"Password1"}' \
  | python3 backend/db/postgres_service.py --action login --stdin
```

Example connection string:

```env
PREVIO_DATABASE_URL=postgresql://previo:previo@localhost:5432/previo
```

Key actions include:

- Auth: `signup`, `login`, `logout`, `oauth_login`, `get_user_by_session`
- User: `update_me`
- Projects: `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`
- Collaboration: `add_collaborator`, `list_invitations`, `respond_invitation`
- Versioning: `list_project_versions`, `revert_project_version`

## Markdown scripts

Preview payload:

```bash
cat sample.md | python3 backend/markdown/markdown_preview.py --stdin
```

Render downloadable HTML:

```bash
cat sample.md | python3 backend/markdown/markdown_renderer.py --stdin --output-file /tmp/out.html
```

## LaTeX scripts

Preview payload:

```bash
cat sample.tex | python3 backend/latex/latex_preview.py --stdin
```

Render downloadable PDF:

```bash
cat sample.tex | python3 backend/latex/latex_renderer.py --stdin --output-file /tmp/out.pdf
```

## Notes

- PostgreSQL migrations run automatically inside `postgres_service.py`.
- OAuth credentials are read by the UI layer (Next.js routes), not by these Python scripts directly.
- `update_project` accepts optional `comment`; when provided it becomes the version `changeSummary`.
- `create_project` accepts optional `content`; when provided (for imports), it overrides template-generated starter content.
- In Docker, scripts run from the UI container runtime (not as a separate backend service).
