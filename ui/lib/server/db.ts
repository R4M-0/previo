import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  Collaborator,
  Project,
  ProjectInvitation,
  ProjectVersion,
  User,
} from "@/types";

type DbResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function resolveDbScript(): string {
  const candidates = [
    path.resolve(process.cwd(), "../backend/db/sqlite_service.py"),
    path.resolve(process.cwd(), "backend/db/sqlite_service.py"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("SQLite service script not found.");
}

function runDbAction<T>(action: string, payload?: object): Promise<T> {
  const scriptPath = resolveDbScript();
  return new Promise((resolve, reject) => {
    const args = payload ? [scriptPath, "--action", action, "--stdin"] : [scriptPath, "--action", action];
    const child = spawn("python3", args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error((stderr || `DB action failed: ${action}`).trim()));
        return;
      }

      let parsed: DbResponse<T>;
      try {
        parsed = JSON.parse(stdout.trim()) as DbResponse<T>;
      } catch {
        reject(new Error((stdout || stderr || "Invalid DB response").trim()));
        return;
      }

      if (!parsed.ok) {
        reject(new Error(parsed.error));
        return;
      }

      resolve(parsed.data);
    });

    if (payload) {
      child.stdin.write(JSON.stringify(payload));
    }
    child.stdin.end();
  });
}

export async function listProjects(userId: string, query = ""): Promise<Project[]> {
  return runDbAction<Project[]>("list_projects", { userId, query });
}

export async function getProject(userId: string, projectId: string): Promise<Project> {
  return runDbAction<Project>("get_project", { userId, id: projectId });
}

export async function createProject(
  userId: string,
  title: string,
  format: "markdown" | "latex"
): Promise<Project> {
  return runDbAction<Project>("create_project", { userId, title, format });
}

export async function updateProject(input: {
  userId: string;
  id: string;
  title?: string;
  format?: "markdown" | "latex";
  content?: string;
}): Promise<Project> {
  return runDbAction<Project>("update_project", input);
}

export async function addCollaborator(
  userId: string,
  projectId: string,
  email: string
): Promise<Collaborator> {
  return runDbAction<Collaborator>("add_collaborator", { userId, projectId, email });
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  return runDbAction<User>("signup", input);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: User; sessionToken: string }> {
  return runDbAction<{ user: User; sessionToken: string }>("login", input);
}

export async function logout(sessionToken: string): Promise<{ success: boolean }> {
  return runDbAction<{ success: boolean }>("logout", { sessionToken });
}

export async function getUserBySession(sessionToken: string): Promise<User> {
  return runDbAction<User>("get_user_by_session", { sessionToken });
}

export async function updateMe(input: {
  userId: string;
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<User> {
  return runDbAction<User>("update_me", input);
}

export async function listProjectVersions(
  userId: string,
  projectId: string
): Promise<ProjectVersion[]> {
  return runDbAction<ProjectVersion[]>("list_project_versions", { userId, projectId });
}

export async function revertProjectVersion(
  userId: string,
  projectId: string,
  versionId: string
): Promise<Project> {
  return runDbAction<Project>("revert_project_version", {
    userId,
    projectId,
    versionId,
  });
}

export async function listInvitations(userId: string): Promise<ProjectInvitation[]> {
  return runDbAction<ProjectInvitation[]>("list_invitations", { userId });
}

export async function respondInvitation(
  userId: string,
  invitationId: string,
  decision: "accept" | "deny"
): Promise<{ status: "accepted" | "denied" }> {
  return runDbAction<{ status: "accepted" | "denied" }>("respond_invitation", {
    userId,
    invitationId,
    decision,
  });
}
