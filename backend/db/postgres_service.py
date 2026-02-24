#!/usr/bin/env python3
"""PostgreSQL service used by Next.js API routes."""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import secrets
import psycopg
from psycopg.rows import dict_row
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

DEFAULT_DATABASE_URL = os.getenv(
    "PREVIO_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql://previo:previo@postgres:5432/previo"),
)
SESSION_DURATION_DAYS = 14


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def now_iso() -> str:
    return now_utc().isoformat()


def iso_in_days(days: int) -> str:
    return (now_utc() + timedelta(days=days)).isoformat()


def hash_password(password: str) -> str:
    iterations = 390000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    ).hex()
    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations_text, salt, expected = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
        ).hex()
        return secrets.compare_digest(digest, expected)
    except Exception:
        return False


def default_markdown_content() -> str:
    return (
        "# New Document\n\n"
        "Start writing in Markdown.\n\n"
        "- Add sections\n"
        "- Add tables\n"
        "- Add code blocks\n"
    )


def default_latex_content() -> str:
    return (
        "\\documentclass{article}\n"
        "\\begin{document}\n\n"
        "\\section{Introduction}\n"
        "Start writing your LaTeX document here...\n\n"
        "\\end{document}\n"
    )


def markdown_template_content(template: str, title: str) -> str:
    safe_title = title.strip() or "New Document"
    if template == "thesis":
        return (
            f"# {safe_title}\n\n"
            "## Abstract\n\n"
            "Write a concise abstract.\n\n"
            "## Introduction\n\n"
            "Introduce context, scope, and objectives.\n\n"
            "## Literature Review\n\n"
            "Summarize related work and references.\n\n"
            "## Methodology\n\n"
            "Describe methods, tools, and datasets.\n\n"
            "## Results\n\n"
            "Present findings, tables, and figures.\n\n"
            "## Conclusion\n\n"
            "Wrap up and propose future work.\n"
        )
    if template == "report":
        return (
            f"# {safe_title}\n\n"
            "## Executive Summary\n\n"
            "Brief summary of key outcomes.\n\n"
            "## Context\n\n"
            "Background and stakeholders.\n\n"
            "## Scope\n\n"
            "- In scope\n"
            "- Out of scope\n\n"
            "## Deliverables\n\n"
            "List expected outputs.\n\n"
            "## Timeline\n\n"
            "| Milestone | Date |\n"
            "|---|---|\n"
            "| Kickoff | TBD |\n"
            "| Delivery | TBD |\n\n"
            "## Risks\n\n"
            "Main risks and mitigation plan.\n"
        )
    if template == "api_docs":
        return (
            f"# API Documentation: {safe_title}\n\n"
            "## Base URL\n\n"
            "`https://api.example.com`\n\n"
            "## Authentication\n\n"
            "Bearer token in the `Authorization` header.\n\n"
            "## Endpoints\n\n"
            "### GET /resource\n\n"
            "- Description: List resources\n"
            "- Response: `200 OK`\n\n"
            "### POST /resource\n\n"
            "- Description: Create resource\n"
            "- Body: JSON payload\n"
            "- Response: `201 Created`\n\n"
            "## Error Codes\n\n"
            "- `400` Bad Request\n"
            "- `401` Unauthorized\n"
            "- `404` Not Found\n"
            "- `500` Internal Server Error\n"
        )
    if template == "article":
        return (
            f"# {safe_title}\n\n"
            "## Abstract\n\n"
            "A short abstract describing the article.\n\n"
            "## Introduction\n\n"
            "Present the topic and motivation.\n\n"
            "## Main Body\n\n"
            "Develop your arguments and evidence.\n\n"
            "## Discussion\n\n"
            "Interpret results and implications.\n\n"
            "## Conclusion\n\n"
            "Final takeaways.\n"
        )
    return default_markdown_content()


def latex_template_content(template: str) -> str:
    if template == "thesis":
        return (
            "\\documentclass[12pt]{report}\n"
            "\\usepackage[utf8]{inputenc}\n"
            "\\usepackage[T1]{fontenc}\n\n"
            "\\begin{document}\n\n"
            "\\title{Thesis Title}\n"
            "\\author{Author Name}\n"
            "\\date{\\today}\n"
            "\\maketitle\n"
            "\\tableofcontents\n\n"
            "\\chapter{Introduction}\n"
            "Write your introduction.\n\n"
            "\\chapter{Literature Review}\n"
            "Summarize related work.\n\n"
            "\\chapter{Methodology}\n"
            "Describe your methods.\n\n"
            "\\chapter{Results}\n"
            "Present your results.\n\n"
            "\\chapter{Conclusion}\n"
            "Conclude and suggest future work.\n\n"
            "\\end{document}\n"
        )
    if template == "report":
        return (
            "\\documentclass[12pt]{report}\n"
            "\\usepackage[utf8]{inputenc}\n"
            "\\usepackage[T1]{fontenc}\n\n"
            "\\begin{document}\n\n"
            "\\title{Project Report}\n"
            "\\author{Author Name}\n"
            "\\date{\\today}\n"
            "\\maketitle\n"
            "\\tableofcontents\n\n"
            "\\chapter{Executive Summary}\n"
            "Summary of the report.\n\n"
            "\\chapter{Context and Scope}\n"
            "Define context and scope.\n\n"
            "\\chapter{Plan and Deliverables}\n"
            "List milestones and deliverables.\n\n"
            "\\chapter{Risks and Mitigation}\n"
            "Document key risks.\n\n"
            "\\end{document}\n"
        )
    if template == "api_docs":
        return (
            "\\documentclass[11pt]{article}\n"
            "\\usepackage[utf8]{inputenc}\n"
            "\\usepackage[T1]{fontenc}\n"
            "\\usepackage{hyperref}\n\n"
            "\\begin{document}\n\n"
            "\\title{API Documentation}\n"
            "\\author{Team}\n"
            "\\date{\\today}\n"
            "\\maketitle\n"
            "\\tableofcontents\n\n"
            "\\section{Base URL}\n"
            "\\texttt{https://api.example.com}\n\n"
            "\\section{Authentication}\n"
            "Use bearer tokens in the Authorization header.\n\n"
            "\\section{Endpoints}\n"
            "\\subsection{GET /resource}\n"
            "List resources.\n\n"
            "\\subsection{POST /resource}\n"
            "Create a resource.\n\n"
            "\\section{Error Codes}\n"
            "\\begin{itemize}\n"
            "\\item 400 Bad Request\n"
            "\\item 401 Unauthorized\n"
            "\\item 404 Not Found\n"
            "\\item 500 Internal Server Error\n"
            "\\end{itemize}\n\n"
            "\\end{document}\n"
        )
    if template == "article":
        return (
            "\\documentclass[11pt]{article}\n"
            "\\usepackage[utf8]{inputenc}\n"
            "\\usepackage[T1]{fontenc}\n\n"
            "\\begin{document}\n\n"
            "\\title{Article Title}\n"
            "\\author{Author Name}\n"
            "\\date{\\today}\n"
            "\\maketitle\n\n"
            "\\begin{abstract}\n"
            "Write a concise abstract.\n"
            "\\end{abstract}\n\n"
            "\\section{Introduction}\n"
            "Introduce the topic.\n\n"
            "\\section{Main Section}\n"
            "Develop the main argument.\n\n"
            "\\section{Discussion}\n"
            "Discuss implications.\n\n"
            "\\section{Conclusion}\n"
            "Conclude the article.\n\n"
            "\\end{document}\n"
        )
    return default_latex_content()


def template_content(fmt: str, template: str, title: str) -> str:
    if template == "blank":
        return default_markdown_content() if fmt == "markdown" else default_latex_content()
    if fmt == "markdown":
        return markdown_template_content(template, title)
    return latex_template_content(template)


def color_for_seed(seed: str) -> str:
    palette = ["#E07B54", "#5B8DD9", "#56B870", "#9B6DD4", "#E0A854"]
    return palette[abs(hash(seed)) % len(palette)]


def get_conn() -> Any:
    return psycopg.connect(DEFAULT_DATABASE_URL, row_factory=dict_row)


def has_column(conn: Any, table: str, column: str) -> bool:
    row = conn.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_name = %s
        """,
        (table, column),
    ).fetchone()
    return row is not None


def migrate(conn: Any) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collaborators (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          title TEXT NOT NULL,
          format TEXT NOT NULL CHECK (format IN ('markdown', 'latex')),
          content TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_collaborators (
          project_id TEXT NOT NULL,
          collaborator_id TEXT NOT NULL,
          PRIMARY KEY (project_id, collaborator_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_oauth_accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
          provider_user_id TEXT NOT NULL,
          provider_email TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(provider, provider_user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_versions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          actor_user_id TEXT NOT NULL,
          snapshot_title TEXT NOT NULL,
          snapshot_format TEXT NOT NULL CHECK (snapshot_format IN ('markdown', 'latex')),
          snapshot_content TEXT NOT NULL,
          change_summary TEXT NOT NULL,
          diff_text TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_members (
          project_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          added_by_user_id TEXT NOT NULL,
          added_at TEXT NOT NULL,
          PRIMARY KEY (project_id, user_id),
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_invitations (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          inviter_user_id TEXT NOT NULL,
          invite_email TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
          created_at TEXT NOT NULL,
          accepted_at TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """
    )

    if not has_column(conn, "users", "password_hash"):
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT")
    if not has_column(conn, "users", "created_at"):
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TEXT")
        conn.execute("UPDATE users SET created_at = %s WHERE created_at IS NULL", (now_iso(),))

    if not has_column(conn, "projects", "owner_id"):
        conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id TEXT")
        first_user = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        if first_user is None:
            first_user_id = "u1"
            conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    first_user_id,
                    "Omar Chiboub",
                    "omar@previo.app",
                    hash_password("Password1"),
                    now_iso(),
                ),
            )
        else:
            first_user_id = first_user["id"]
        conn.execute(
            "UPDATE projects SET owner_id = %s WHERE owner_id IS NULL OR owner_id = ''",
            (first_user_id,),
        )

    users_missing_hash = conn.execute(
        "SELECT id FROM users WHERE password_hash IS NULL OR password_hash = ''"
    ).fetchall()
    for row in users_missing_hash:
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hash_password("Password1"), row["id"]),
        )

    conn.commit()
    seed_initial_versions(conn)

    # One-time migration: map legacy project_collaborators rows to real users by email.
    if has_column(conn, "collaborators", "email"):
        rows = conn.execute(
            """
            SELECT pc.project_id, c.email, p.owner_id
            FROM project_collaborators pc
            INNER JOIN collaborators c ON c.id = pc.collaborator_id
            INNER JOIN projects p ON p.id = pc.project_id
            """
        ).fetchall()
        for row in rows:
            user = conn.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s)",
                (row["email"],),
            ).fetchone()
            if user and user["id"] != row["owner_id"]:
                conn.execute(
                    """
                    INSERT INTO project_members (project_id, user_id, added_by_user_id, added_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (row["project_id"], user["id"], row["owner_id"], now_iso()),
                )
        conn.commit()


def seed_initial_versions(conn: Any) -> None:
    rows = conn.execute(
        """
        SELECT p.id, p.owner_id, p.title, p.format, p.content
        FROM projects p
        LEFT JOIN project_versions pv ON pv.project_id = p.id
        GROUP BY p.id
        HAVING COUNT(pv.id) = 0
        """
    ).fetchall()
    for row in rows:
        create_version_entry(
            conn,
            project_id=row["id"],
            actor_user_id=row["owner_id"],
            new_title=row["title"],
            new_format=row["format"],
            new_content=row["content"],
            old_title="",
            old_format=row["format"],
            old_content="",
            explicit_summary="Initial version",
        )
    conn.commit()


def seed_if_empty(conn: Any) -> None:
    users_count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if users_count > 0:
        return

    now = now_iso()
    conn.execute(
        """
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        ("u1", "Omar Chiboub", "omar@previo.app", hash_password("Password1"), now),
    )

    collaborators = [
        ("c1", "Ghassen Naouar", "ghassen@previo.app", "#E07B54"),
        ("c2", "Louay Dardouri", "louay@previo.app", "#5B8DD9"),
        ("c3", "Amin Khalsi", "amin@previo.app", "#56B870"),
    ]
    for collaborator in collaborators:
        conn.execute(
            "INSERT INTO collaborators (id, name, email, color) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            collaborator,
        )

    projects = [
        (
            "p1",
            "u1",
            "Thesis - Chapter 3: Methodology",
            "latex",
            "\\documentclass{article}\n\\begin{document}\n\\section{Introduction}\nMethodology draft.\n\\end{document}\n",
            now,
        ),
        (
            "p2",
            "u1",
            "API Documentation - Previo REST API",
            "markdown",
            "# API Documentation\n\nDescribe your API endpoints here.",
            now,
        ),
    ]
    for project in projects:
        conn.execute(
            """
            INSERT INTO projects (id, owner_id, title, format, content, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            project,
        )

    for project_collaborator in [("p1", "c1"), ("p1", "c2"), ("p2", "c3")]:
        conn.execute(
            """
            INSERT INTO project_collaborators (project_id, collaborator_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            project_collaborator,
        )
    for project in projects:
        project_id, owner_id, title, fmt, content, _updated_at = project
        create_version_entry(
            conn,
            project_id=project_id,
            actor_user_id=owner_id,
            new_title=title,
            new_format=fmt,
            new_content=content,
            old_title="",
            old_format=fmt,
            old_content="",
            explicit_summary="Initial version",
        )
    conn.commit()


def public_user(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def get_accessible_project(
    conn: Any, user_id: str, project_id: str
) -> dict[str, Any] | None:
    return conn.execute(
        """
        SELECT p.id, p.owner_id, p.title, p.format, p.content, p.updated_at
        FROM projects p
        WHERE p.id = %s
          AND (
            p.owner_id = %s
            OR EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = %s
            )
          )
        """,
        (project_id, user_id, user_id),
    ).fetchone()


def session_user(conn: Any, token: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT u.id, u.name, u.email, s.expires_at
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token = %s
        """,
        (token,),
    ).fetchone()
    if row is None:
        return None
    if datetime.fromisoformat(row["expires_at"]) <= now_utc():
        conn.execute("DELETE FROM sessions WHERE token = %s", (token,))
        conn.commit()
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def update_me(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")

    row = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE id = %s",
        (user_id,),
    ).fetchone()
    if row is None:
        raise ValueError("User not found")

    name = str(payload.get("name", row["name"])).strip()
    email = str(payload.get("email", row["email"])).strip().lower()
    current_password = str(payload.get("currentPassword", ""))
    new_password = str(payload.get("newPassword", ""))

    if not name:
        raise ValueError("Name cannot be empty.")
    if not email:
        raise ValueError("Email cannot be empty.")

    if email != row["email"]:
        exists = conn.execute("SELECT id FROM users WHERE email = %s", (email,)).fetchone()
        if exists and exists["id"] != user_id:
            raise ValueError("An account with this email already exists.")

    password_hash = row["password_hash"]
    if new_password:
        if len(new_password) < 8:
            raise ValueError("New password must be at least 8 characters.")
        if not current_password:
            raise ValueError("Current password is required to set a new password.")
        if not verify_password(current_password, password_hash or ""):
            raise ValueError("Current password is incorrect.")
        password_hash = hash_password(new_password)

    conn.execute(
        """
        UPDATE users
        SET name = %s, email = %s, password_hash = %s
        WHERE id = %s
        """,
        (name, email, password_hash, user_id),
    )
    conn.commit()

    updated = conn.execute(
        "SELECT id, name, email FROM users WHERE id = %s",
        (user_id,),
    ).fetchone()
    return public_user(updated) or {}


def signup(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not name:
        raise ValueError("Missing required field: name")
    if not email:
        raise ValueError("Missing required field: email")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    exists = conn.execute("SELECT id FROM users WHERE email = %s", (email,)).fetchone()
    if exists:
        raise ValueError("An account with this email already exists.")

    user_id = f"u_{uuid.uuid4().hex[:8]}"
    conn.execute(
        """
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, name, email, hash_password(password), now_iso()),
    )
    conn.commit()
    row = conn.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,)).fetchone()
    if row is None:
        raise RuntimeError("Failed to create user")
    return public_user(row) or {}


def login(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not email or not password:
        raise ValueError("Missing required fields: email, password")

    row = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,)
    ).fetchone()
    if row is None or not verify_password(password, row["password_hash"] or ""):
        raise ValueError("Invalid email or password.")

    token = secrets.token_urlsafe(48)
    conn.execute(
        """
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (token, row["id"], now_iso(), iso_in_days(SESSION_DURATION_DAYS)),
    )
    conn.commit()
    return {"user": public_user(row), "sessionToken": token}


def logout(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("sessionToken", "")).strip()
    if token:
        conn.execute("DELETE FROM sessions WHERE token = %s", (token,))
        conn.commit()
    return {"success": True}


def oauth_login(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    provider = str(payload.get("provider", "")).strip().lower()
    provider_user_id = str(payload.get("providerUserId", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    name = str(payload.get("name", "")).strip()

    if provider not in ("google", "github"):
        raise ValueError("Invalid provider.")
    if not provider_user_id:
        raise ValueError("Missing provider user id.")
    if not email:
        raise ValueError("Missing email from provider profile.")

    oauth_row = conn.execute(
        """
        SELECT u.id, u.name, u.email
        FROM user_oauth_accounts oa
        INNER JOIN users u ON u.id = oa.user_id
        WHERE oa.provider = %s AND oa.provider_user_id = %s
        """,
        (provider, provider_user_id),
    ).fetchone()

    if oauth_row is not None:
        user_id = oauth_row["id"]
        user = {"id": oauth_row["id"], "name": oauth_row["name"], "email": oauth_row["email"]}
    else:
        user_row = conn.execute(
            "SELECT id, name, email FROM users WHERE lower(email) = lower(%s)",
            (email,),
        ).fetchone()

        if user_row is None:
            user_id = f"u_{uuid.uuid4().hex[:8]}"
            display_name = name or email.split("@")[0]
            conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, display_name, email, hash_password(secrets.token_urlsafe(24)), now_iso()),
            )
            user = {"id": user_id, "name": display_name, "email": email}
        else:
            user_id = user_row["id"]
            user = {"id": user_row["id"], "name": user_row["name"], "email": user_row["email"]}

        conn.execute(
            """
            INSERT INTO user_oauth_accounts
            (id, user_id, provider, provider_user_id, provider_email, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (f"oa_{uuid.uuid4().hex[:10]}", user_id, provider, provider_user_id, email, now_iso()),
        )

    token = secrets.token_urlsafe(48)
    conn.execute(
        """
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (token, user_id, now_iso(), iso_in_days(SESSION_DURATION_DAYS)),
    )
    conn.commit()
    return {"user": user, "sessionToken": token}


def collaborator_rows(conn: Any, project_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT u.id, u.name, u.email
        FROM project_members pm
        INNER JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = %s
        ORDER BY u.name
        """,
        (project_id,),
    ).fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "color": color_for_seed(row["email"]),
        }
        for row in rows
    ]


def project_row_to_dict(conn: Any, row: dict[str, Any]) -> dict[str, Any]:
    project = dict(row)
    project["updatedAt"] = project.pop("updated_at")
    if "owner_id" in project:
        project["ownerId"] = project.pop("owner_id")
    project["collaborators"] = collaborator_rows(conn, project["id"])
    return project


def build_diff_text(old_content: str, new_content: str) -> str:
    old_lines = old_content.splitlines()
    new_lines = new_content.splitlines()
    diff_lines = list(
        difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile="before",
            tofile="after",
            lineterm="",
            n=3,
        )
    )
    return "\n".join(diff_lines) if diff_lines else "No content changes."


def build_change_summary(
    old_title: str,
    old_format: str,
    old_content: str,
    new_title: str,
    new_format: str,
    new_content: str,
) -> str:
    changes: list[str] = []
    if old_title != new_title:
        changes.append("title")
    if old_format != new_format:
        changes.append("format")
    if old_content != new_content:
        changes.append("content")
    if not changes:
        return "No changes"
    joined = ", ".join(changes)
    return f"Updated {joined}"


def create_version_entry(
    conn: Any,
    *,
    project_id: str,
    actor_user_id: str,
    new_title: str,
    new_format: str,
    new_content: str,
    old_title: str,
    old_format: str,
    old_content: str,
    explicit_summary: str | None = None,
) -> None:
    version_id = f"v_{uuid.uuid4().hex[:10]}"
    summary = explicit_summary or build_change_summary(
        old_title, old_format, old_content, new_title, new_format, new_content
    )
    diff_text = build_diff_text(old_content, new_content)
    conn.execute(
        """
        INSERT INTO project_versions (
          id, project_id, actor_user_id, snapshot_title, snapshot_format, snapshot_content,
          change_summary, diff_text, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            version_id,
            project_id,
            actor_user_id,
            new_title,
            new_format,
            new_content,
            summary,
            diff_text,
            now_iso(),
        ),
    )


def list_projects(conn: Any, user_id: str, query: str = "") -> list[dict[str, Any]]:
    if not user_id:
        raise ValueError("Missing required field: userId")

    query = query.strip()
    query_sql = f"%{query}%"
    rows = conn.execute(
        """
        SELECT p.id, p.owner_id, p.title, p.format, p.content, p.updated_at
        FROM projects p
        WHERE (
            p.owner_id = %s
            OR EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = %s
            )
          )
          AND (
            %s = ''
            OR p.title LIKE %s
            OR p.content LIKE %s
            OR p.format LIKE %s
          )
        ORDER BY p.updated_at DESC
        """,
        (user_id, user_id, query, query_sql, query_sql, query_sql),
    ).fetchall()
    return [project_row_to_dict(conn, row) for row in rows]


def get_project(conn: Any, user_id: str, project_id: str) -> dict[str, Any] | None:
    row = get_accessible_project(conn, user_id, project_id)
    if row is None:
        return None
    return project_row_to_dict(conn, row)


def create_project(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    title = str(payload.get("title", "")).strip()
    fmt = str(payload.get("format", "")).strip()
    template = str(payload.get("template", "blank")).strip().lower()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not title:
        raise ValueError("Missing required field: title")
    if fmt not in ("markdown", "latex"):
        raise ValueError("Invalid format. Expected 'markdown' or 'latex'.")
    if template not in ("blank", "thesis", "report", "api_docs", "article"):
        raise ValueError("Invalid template.")

    project_id = f"p_{uuid.uuid4().hex[:8]}"
    content = template_content(fmt, template, title)
    updated_at = now_iso()

    conn.execute(
        """
        INSERT INTO projects (id, owner_id, title, format, content, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (project_id, user_id, title, fmt, content, updated_at),
    )
    create_version_entry(
        conn,
        project_id=project_id,
        actor_user_id=user_id,
        new_title=title,
        new_format=fmt,
        new_content=content,
        old_title="",
        old_format=fmt,
        old_content="",
        explicit_summary="Initial version",
    )
    conn.commit()
    project = get_project(conn, user_id, project_id)
    if project is None:
        raise RuntimeError("Failed to create project")
    return project


def update_project(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("id", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id:
        raise ValueError("Missing required field: id")

    project = get_project(conn, user_id, project_id)
    if project is None:
        raise ValueError("Project not found")

    title = str(payload.get("title", project["title"]))
    fmt = str(payload.get("format", project["format"]))
    content = str(payload.get("content", project["content"]))
    comment = str(payload.get("comment", "")).strip()
    if fmt not in ("markdown", "latex"):
        raise ValueError("Invalid format. Expected 'markdown' or 'latex'.")

    if (
        title == project["title"]
        and fmt == project["format"]
        and content == project["content"]
    ):
        return project

    project_row = get_accessible_project(conn, user_id, project_id)
    if project_row is None:
        raise ValueError("Project not found")

    conn.execute(
        """
        UPDATE projects
        SET title = %s, format = %s, content = %s, updated_at = %s
        WHERE id = %s
        """,
        (title, fmt, content, now_iso(), project_id),
    )
    create_version_entry(
        conn,
        project_id=project_id,
        actor_user_id=user_id,
        new_title=title,
        new_format=fmt,
        new_content=content,
        old_title=project["title"],
        old_format=project["format"],
        old_content=project["content"],
        explicit_summary=(comment or None),
    )
    conn.commit()
    updated = get_project(conn, user_id, project_id)
    if updated is None:
        raise RuntimeError("Failed to update project")
    return updated


def delete_project(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("id", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id:
        raise ValueError("Missing required field: id")

    project = conn.execute(
        "SELECT id, owner_id FROM projects WHERE id = %s",
        (project_id,),
    ).fetchone()
    if project is None:
        raise ValueError("Project not found")
    if project["owner_id"] != user_id:
        raise ValueError("Only the project owner can delete this project.")

    conn.execute("DELETE FROM projects WHERE id = %s", (project_id,))
    conn.commit()
    return {"deleted": True, "id": project_id}


def add_collaborator(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("projectId", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id or not email:
        raise ValueError("Missing required fields: projectId, email")

    project = get_accessible_project(conn, user_id, project_id)
    if project is None:
        raise ValueError("Project not found")

    invitee_user = conn.execute(
        "SELECT id, name, email FROM users WHERE lower(email) = lower(%s)",
        (email,),
    ).fetchone()
    if invitee_user and invitee_user["id"] == project["owner_id"]:
        raise ValueError("Project owner is already part of the project.")

    if invitee_user:
        membership = conn.execute(
            """
            SELECT 1 FROM project_members
            WHERE project_id = %s AND user_id = %s
            """,
            (project_id, invitee_user["id"]),
        ).fetchone()
        if membership:
            raise ValueError("User is already a collaborator on this project.")

    existing_pending = conn.execute(
        """
        SELECT id FROM project_invitations
        WHERE project_id = %s AND lower(invite_email) = lower(%s) AND status = 'pending'
        """,
        (project_id, email),
    ).fetchone()
    if existing_pending:
        raise ValueError("An invitation is already pending for this email.")

    invitation_id = f"inv_{uuid.uuid4().hex[:10]}"
    conn.execute(
        """
        INSERT INTO project_invitations (
          id, project_id, inviter_user_id, invite_email, status, created_at
        )
        VALUES (%s, %s, %s, %s, 'pending', %s)
        """,
        (invitation_id, project_id, user_id, email, now_iso()),
    )
    collaborator = {
        "id": invitation_id,
        "name": (invitee_user["name"] if invitee_user else email.split("@")[0]),
        "email": email,
        "color": color_for_seed(email),
        "status": "pending",
    }
    conn.execute(
        "UPDATE projects SET updated_at = %s WHERE id = %s",
        (now_iso(), project_id),
    )
    conn.commit()
    return collaborator


def list_invitations(conn: Any, user_id: str) -> list[dict[str, Any]]:
    user = conn.execute(
        "SELECT id, email FROM users WHERE id = %s",
        (user_id,),
    ).fetchone()
    if user is None:
        raise ValueError("User not found")

    rows = conn.execute(
        """
        SELECT
          i.id,
          i.project_id,
          i.invite_email,
          i.status,
          i.created_at,
          p.title AS project_title,
          p.format AS project_format,
          u.id AS inviter_id,
          u.name AS inviter_name,
          u.email AS inviter_email
        FROM project_invitations i
        INNER JOIN projects p ON p.id = i.project_id
        INNER JOIN users u ON u.id = i.inviter_user_id
        WHERE lower(i.invite_email) = lower(%s)
          AND i.status = 'pending'
        ORDER BY i.created_at DESC
        """,
        (user["email"],),
    ).fetchall()

    return [
        {
            "id": row["id"],
            "projectId": row["project_id"],
            "projectTitle": row["project_title"],
            "projectFormat": row["project_format"],
            "inviteEmail": row["invite_email"],
            "status": row["status"],
            "createdAt": row["created_at"],
            "inviter": {
                "id": row["inviter_id"],
                "name": row["inviter_name"],
                "email": row["inviter_email"],
            },
        }
        for row in rows
    ]


def respond_invitation(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    invitation_id = str(payload.get("invitationId", "")).strip()
    decision = str(payload.get("decision", "")).strip().lower()

    if not user_id:
        raise ValueError("Missing required field: userId")
    if not invitation_id:
        raise ValueError("Missing required field: invitationId")
    if decision not in ("accept", "deny"):
        raise ValueError("Invalid decision. Expected 'accept' or 'deny'.")

    user = conn.execute(
        "SELECT id, email FROM users WHERE id = %s",
        (user_id,),
    ).fetchone()
    if user is None:
        raise ValueError("User not found")

    invitation = conn.execute(
        """
        SELECT id, project_id, inviter_user_id, invite_email, status
        FROM project_invitations
        WHERE id = %s
        """,
        (invitation_id,),
    ).fetchone()
    if invitation is None or invitation["status"] != "pending":
        raise ValueError("Invitation not found or no longer pending.")

    if invitation["invite_email"].lower() != user["email"].lower():
        raise ValueError("You are not allowed to respond to this invitation.")

    if decision == "accept":
        owner_row = conn.execute(
            "SELECT owner_id FROM projects WHERE id = %s",
            (invitation["project_id"],),
        ).fetchone()
        if owner_row and owner_row["owner_id"] != user_id:
            conn.execute(
                """
                INSERT INTO project_members (project_id, user_id, added_by_user_id, added_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    invitation["project_id"],
                    user_id,
                    invitation["inviter_user_id"],
                    now_iso(),
                ),
            )
        conn.execute(
            """
            UPDATE project_invitations
            SET status = 'accepted', accepted_at = %s
            WHERE id = %s
            """,
            (now_iso(), invitation_id),
        )
        conn.commit()
        return {"status": "accepted"}

    # Deny: remove pending invitation.
    conn.execute(
        "DELETE FROM project_invitations WHERE id = %s",
        (invitation_id,),
    )
    conn.commit()
    return {"status": "denied"}


def list_project_versions(
    conn: Any, user_id: str, project_id: str
) -> list[dict[str, Any]]:
    if get_accessible_project(conn, user_id, project_id) is None:
        raise ValueError("Project not found")

    rows = conn.execute(
        """
        SELECT
          pv.id,
          pv.project_id,
          pv.snapshot_title,
          pv.snapshot_format,
          pv.snapshot_content,
          pv.change_summary,
          pv.diff_text,
          pv.created_at,
          u.id AS actor_id,
          u.name AS actor_name,
          u.email AS actor_email
        FROM project_versions pv
        INNER JOIN users u ON u.id = pv.actor_user_id
        WHERE pv.project_id = %s
        ORDER BY pv.created_at DESC
        """,
        (project_id,),
    ).fetchall()

    versions: list[dict[str, Any]] = []
    for row in rows:
        versions.append(
            {
                "id": row["id"],
                "projectId": row["project_id"],
                "snapshotTitle": row["snapshot_title"],
                "snapshotFormat": row["snapshot_format"],
                "snapshotContent": row["snapshot_content"],
                "changeSummary": row["change_summary"],
                "diffText": row["diff_text"],
                "createdAt": row["created_at"],
                "actor": {
                    "id": row["actor_id"],
                    "name": row["actor_name"],
                    "email": row["actor_email"],
                },
            }
        )
    return versions


def revert_project_version(conn: Any, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("projectId", "")).strip()
    version_id = str(payload.get("versionId", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id or not version_id:
        raise ValueError("Missing required fields: projectId, versionId")

    current = get_accessible_project(conn, user_id, project_id)
    if current is None:
        raise ValueError("Project not found")

    version = conn.execute(
        """
        SELECT id, snapshot_title, snapshot_format, snapshot_content
        FROM project_versions
        WHERE id = %s AND project_id = %s
        """,
        (version_id, project_id),
    ).fetchone()
    if version is None:
        raise ValueError("Version not found")

    conn.execute(
        """
        UPDATE projects
        SET title = %s, format = %s, content = %s, updated_at = %s
        WHERE id = %s
        """,
        (
            version["snapshot_title"],
            version["snapshot_format"],
            version["snapshot_content"],
            now_iso(),
            project_id,
        )
    )
    create_version_entry(
        conn,
        project_id=project_id,
        actor_user_id=user_id,
        new_title=version["snapshot_title"],
        new_format=version["snapshot_format"],
        new_content=version["snapshot_content"],
        old_title=current["title"],
        old_format=current["format"],
        old_content=current["content"],
        explicit_summary=f"Reverted to version {version_id}",
    )
    conn.commit()
    reverted = get_project(conn, user_id, project_id)
    if reverted is None:
        raise RuntimeError("Failed to revert project")
    return reverted


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PostgreSQL service for Previo")
    parser.add_argument("--action", required=True)
    parser.add_argument("--stdin", action="store_true")
    return parser.parse_args()


def load_payload(args: argparse.Namespace) -> dict[str, Any]:
    if not args.stdin:
        return {}
    import sys

    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def main() -> int:
    args = parse_args()
    payload = load_payload(args)

    try:
        conn = get_conn()
        migrate(conn)
        seed_if_empty(conn)

        action = args.action
        if action == "signup":
            data = signup(conn, payload)
        elif action == "login":
            data = login(conn, payload)
        elif action == "logout":
            data = logout(conn, payload)
        elif action == "oauth_login":
            data = oauth_login(conn, payload)
        elif action == "get_user_by_session":
            token = str(payload.get("sessionToken", "")).strip()
            if not token:
                raise ValueError("Missing required field: sessionToken")
            data = session_user(conn, token)
            if data is None:
                raise ValueError("Invalid or expired session.")
        elif action == "list_projects":
            data = list_projects(
                conn,
                str(payload.get("userId", "")).strip(),
                str(payload.get("query", "")).strip(),
            )
        elif action == "get_project":
            data = get_project(
                conn, str(payload.get("userId", "")).strip(), str(payload.get("id", "")).strip()
            )
            if data is None:
                raise ValueError("Project not found")
        elif action == "create_project":
            data = create_project(conn, payload)
        elif action == "update_project":
            data = update_project(conn, payload)
        elif action == "delete_project":
            data = delete_project(conn, payload)
        elif action == "add_collaborator":
            data = add_collaborator(conn, payload)
        elif action == "update_me":
            data = update_me(conn, payload)
        elif action == "list_invitations":
            data = list_invitations(conn, str(payload.get("userId", "")).strip())
        elif action == "respond_invitation":
            data = respond_invitation(conn, payload)
        elif action == "list_project_versions":
            data = list_project_versions(
                conn,
                str(payload.get("userId", "")).strip(),
                str(payload.get("projectId", "")).strip(),
            )
        elif action == "revert_project_version":
            data = revert_project_version(conn, payload)
        else:
            raise ValueError(f"Unknown action: {action}")

        print(json.dumps({"ok": True, "data": data}))
        conn.close()
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
