#!/usr/bin/env python3
"""
SQLite service used by Next.js API routes.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "backend" / "data" / "previo.db"
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


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def has_column(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r["name"] == column for r in rows)


def migrate(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
        """
    )

    if not has_column(conn, "users", "password_hash"):
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if not has_column(conn, "users", "created_at"):
        conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT")
        conn.execute("UPDATE users SET created_at = ? WHERE created_at IS NULL", (now_iso(),))

    if not has_column(conn, "projects", "owner_id"):
        conn.execute("ALTER TABLE projects ADD COLUMN owner_id TEXT")
        first_user = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        if first_user is None:
            first_user_id = "u1"
            conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
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
            "UPDATE projects SET owner_id = ? WHERE owner_id IS NULL OR owner_id = ''",
            (first_user_id,),
        )

    users_missing_hash = conn.execute(
        "SELECT id FROM users WHERE password_hash IS NULL OR password_hash = ''"
    ).fetchall()
    for row in users_missing_hash:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password("Password1"), row["id"]),
        )

    conn.commit()
    seed_initial_versions(conn)


def seed_initial_versions(conn: sqlite3.Connection) -> None:
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


def seed_if_empty(conn: sqlite3.Connection) -> None:
    users_count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if users_count > 0:
        return

    now = now_iso()
    conn.execute(
        """
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("u1", "Omar Chiboub", "omar@previo.app", hash_password("Password1"), now),
    )

    collaborators = [
        ("c1", "Ghassen Naouar", "ghassen@previo.app", "#E07B54"),
        ("c2", "Louay Dardouri", "louay@previo.app", "#5B8DD9"),
        ("c3", "Amin Khalsi", "amin@previo.app", "#56B870"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO collaborators (id, name, email, color) VALUES (?, ?, ?, ?)",
        collaborators,
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
    conn.executemany(
        """
        INSERT OR IGNORE INTO projects (id, owner_id, title, format, content, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        projects,
    )

    conn.executemany(
        """
        INSERT OR IGNORE INTO project_collaborators (project_id, collaborator_id)
        VALUES (?, ?)
        """,
        [("p1", "c1"), ("p1", "c2"), ("p2", "c3")],
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


def public_user(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def session_user(conn: sqlite3.Connection, token: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT u.id, u.name, u.email, s.expires_at
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()
    if row is None:
        return None
    if datetime.fromisoformat(row["expires_at"]) <= now_utc():
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def update_me(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")

    row = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE id = ?",
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
        exists = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
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
        SET name = ?, email = ?, password_hash = ?
        WHERE id = ?
        """,
        (name, email, password_hash, user_id),
    )
    conn.commit()

    updated = conn.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    return public_user(updated) or {}


def signup(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not name:
        raise ValueError("Missing required field: name")
    if not email:
        raise ValueError("Missing required field: email")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    exists = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if exists:
        raise ValueError("An account with this email already exists.")

    user_id = f"u_{uuid.uuid4().hex[:8]}"
    conn.execute(
        """
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, name, email, hash_password(password), now_iso()),
    )
    conn.commit()
    row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise RuntimeError("Failed to create user")
    return public_user(row) or {}


def login(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if not email or not password:
        raise ValueError("Missing required fields: email, password")

    row = conn.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    if row is None or not verify_password(password, row["password_hash"] or ""):
        raise ValueError("Invalid email or password.")

    token = secrets.token_urlsafe(48)
    conn.execute(
        """
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (token, row["id"], now_iso(), iso_in_days(SESSION_DURATION_DAYS)),
    )
    conn.commit()
    return {"user": public_user(row), "sessionToken": token}


def logout(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("sessionToken", "")).strip()
    if token:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    return {"success": True}


def collaborator_rows(conn: sqlite3.Connection, project_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT c.id, c.name, c.email, c.color
        FROM collaborators c
        INNER JOIN project_collaborators pc ON pc.collaborator_id = c.id
        WHERE pc.project_id = ?
        ORDER BY c.name
        """,
        (project_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def project_row_to_dict(conn: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    project = dict(row)
    project["updatedAt"] = project.pop("updated_at")
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
    conn: sqlite3.Connection,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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


def list_projects(conn: sqlite3.Connection, user_id: str, query: str = "") -> list[dict[str, Any]]:
    if not user_id:
        raise ValueError("Missing required field: userId")

    query = query.strip()
    query_sql = f"%{query}%"
    rows = conn.execute(
        """
        SELECT id, title, format, content, updated_at
        FROM projects
        WHERE owner_id = ?
          AND (
            ? = ''
            OR title LIKE ?
            OR content LIKE ?
            OR format LIKE ?
          )
        ORDER BY datetime(updated_at) DESC
        """,
        (user_id, query, query_sql, query_sql, query_sql),
    ).fetchall()
    return [project_row_to_dict(conn, row) for row in rows]


def get_project(conn: sqlite3.Connection, user_id: str, project_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """
        SELECT id, title, format, content, updated_at
        FROM projects
        WHERE id = ? AND owner_id = ?
        """,
        (project_id, user_id),
    ).fetchone()
    if row is None:
        return None
    return project_row_to_dict(conn, row)


def create_project(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    title = str(payload.get("title", "")).strip()
    fmt = str(payload.get("format", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not title:
        raise ValueError("Missing required field: title")
    if fmt not in ("markdown", "latex"):
        raise ValueError("Invalid format. Expected 'markdown' or 'latex'.")

    project_id = f"p_{uuid.uuid4().hex[:8]}"
    content = default_markdown_content() if fmt == "markdown" else default_latex_content()
    updated_at = now_iso()

    conn.execute(
        """
        INSERT INTO projects (id, owner_id, title, format, content, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
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


def update_project(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
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
    if fmt not in ("markdown", "latex"):
        raise ValueError("Invalid format. Expected 'markdown' or 'latex'.")

    if (
        title == project["title"]
        and fmt == project["format"]
        and content == project["content"]
    ):
        return project

    conn.execute(
        """
        UPDATE projects
        SET title = ?, format = ?, content = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?
        """,
        (title, fmt, content, now_iso(), project_id, user_id),
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
    )
    conn.commit()
    updated = get_project(conn, user_id, project_id)
    if updated is None:
        raise RuntimeError("Failed to update project")
    return updated


def add_collaborator(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("projectId", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id or not email:
        raise ValueError("Missing required fields: projectId, email")

    if get_project(conn, user_id, project_id) is None:
        raise ValueError("Project not found")

    existing = conn.execute(
        "SELECT id, name, email, color FROM collaborators WHERE email = ?",
        (email,),
    ).fetchone()

    if existing is None:
        collaborator_id = f"c_{uuid.uuid4().hex[:8]}"
        name = email.split("@")[0]
        palette = ["#E07B54", "#5B8DD9", "#56B870", "#9B6DD4", "#E0A854"]
        color = palette[abs(hash(email)) % len(palette)]
        conn.execute(
            """
            INSERT INTO collaborators (id, name, email, color)
            VALUES (?, ?, ?, ?)
            """,
            (collaborator_id, name, email, color),
        )
        collaborator = {
            "id": collaborator_id,
            "name": name,
            "email": email,
            "color": color,
        }
    else:
        collaborator = dict(existing)
        collaborator_id = collaborator["id"]

    conn.execute(
        """
        INSERT OR IGNORE INTO project_collaborators (project_id, collaborator_id)
        VALUES (?, ?)
        """,
        (project_id, collaborator_id),
    )
    conn.execute(
        "UPDATE projects SET updated_at = ? WHERE id = ? AND owner_id = ?",
        (now_iso(), project_id, user_id),
    )
    conn.commit()
    return collaborator


def list_project_versions(
    conn: sqlite3.Connection, user_id: str, project_id: str
) -> list[dict[str, Any]]:
    if get_project(conn, user_id, project_id) is None:
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
        WHERE pv.project_id = ?
        ORDER BY datetime(pv.created_at) DESC
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


def revert_project_version(conn: sqlite3.Connection, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("userId", "")).strip()
    project_id = str(payload.get("projectId", "")).strip()
    version_id = str(payload.get("versionId", "")).strip()
    if not user_id:
        raise ValueError("Missing required field: userId")
    if not project_id or not version_id:
        raise ValueError("Missing required fields: projectId, versionId")

    current = get_project(conn, user_id, project_id)
    if current is None:
        raise ValueError("Project not found")

    version = conn.execute(
        """
        SELECT id, snapshot_title, snapshot_format, snapshot_content
        FROM project_versions
        WHERE id = ? AND project_id = ?
        """,
        (version_id, project_id),
    ).fetchone()
    if version is None:
        raise ValueError("Version not found")

    conn.execute(
        """
        UPDATE projects
        SET title = ?, format = ?, content = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?
        """,
        (
            version["snapshot_title"],
            version["snapshot_format"],
            version["snapshot_content"],
            now_iso(),
            project_id,
            user_id,
        ),
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
    parser = argparse.ArgumentParser(description="SQLite service for Previo")
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
        elif action == "add_collaborator":
            data = add_collaborator(conn, payload)
        elif action == "update_me":
            data = update_me(conn, payload)
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
