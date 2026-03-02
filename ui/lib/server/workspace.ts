import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkspaceFileEntry = {
  path: string;
  name: string;
  size: number;
  updatedAt: string;
};

const DEFAULT_WORKSPACE_ROOT = path.resolve(process.cwd(), ".workspaces");

function workspaceRoot(): string {
  const configured = process.env.PREVIO_WORKSPACES_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return DEFAULT_WORKSPACE_ROOT;
}

function normalizeFilename(fileName: string): string {
  const normalized = fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "file";
}

function assertWorkspacePath(projectId: string, relativePath: string): string {
  if (!projectId.trim()) {
    throw new Error("Missing project id.");
  }
  const root = workspaceRoot();
  const projectDir = path.resolve(root, projectId);
  const requested = path.resolve(projectDir, relativePath);
  const basePrefix = projectDir.endsWith(path.sep) ? projectDir : `${projectDir}${path.sep}`;
  if (requested !== projectDir && !requested.startsWith(basePrefix)) {
    throw new Error("Invalid workspace path.");
  }
  return requested;
}

export async function ensureProjectWorkspace(projectId: string): Promise<string> {
  const root = workspaceRoot();
  const projectDir = path.resolve(root, projectId);
  await mkdir(projectDir, { recursive: true });
  return projectDir;
}

async function walkWorkspace(
  rootDir: string,
  currentDir: string,
  files: WorkspaceFileEntry[]
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkWorkspace(rootDir, absolute, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const info = await stat(absolute);
    const relPath = path.relative(rootDir, absolute).split(path.sep).join("/");
    files.push({
      path: relPath,
      name: entry.name,
      size: info.size,
      updatedAt: info.mtime.toISOString(),
    });
  }
}

export async function listWorkspaceFiles(projectId: string): Promise<WorkspaceFileEntry[]> {
  const projectDir = await ensureProjectWorkspace(projectId);
  const files: WorkspaceFileEntry[] = [];
  await walkWorkspace(projectDir, projectDir, files);
  files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return files;
}

export async function saveWorkspaceFile(
  projectId: string,
  fileName: string,
  data: Buffer
): Promise<WorkspaceFileEntry> {
  if (!data.length) {
    throw new Error("File is empty.");
  }
  const projectDir = await ensureProjectWorkspace(projectId);
  const safeName = normalizeFilename(path.basename(fileName));
  const parsed = path.parse(safeName);
  let targetName = safeName;
  let absolute = path.join(projectDir, targetName);
  let suffix = 1;
  // Keep existing files by writing with an incremented suffix.
  while (true) {
    try {
      await stat(absolute);
      targetName = `${parsed.name}-${suffix}${parsed.ext}`;
      absolute = path.join(projectDir, targetName);
      suffix += 1;
    } catch {
      break;
    }
  }
  await writeFile(absolute, data);
  const info = await stat(absolute);
  return {
    path: targetName,
    name: targetName,
    size: info.size,
    updatedAt: info.mtime.toISOString(),
  };
}

export async function readWorkspaceFile(
  projectId: string,
  relativePath: string
): Promise<{ data: Buffer; name: string }> {
  const absolute = assertWorkspacePath(projectId, relativePath);
  const data = await readFile(absolute);
  return { data, name: path.basename(absolute) };
}

export async function deleteWorkspaceFile(
  projectId: string,
  relativePath: string
): Promise<void> {
  const absolute = assertWorkspacePath(projectId, relativePath);
  await rm(absolute, { force: true });
}
