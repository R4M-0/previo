import path from "node:path";
import { NextResponse } from "next/server";
import { createProject } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";
import { ensureProjectWorkspace } from "@/lib/server/workspace";

const MAX_IMPORT_SIZE = 2 * 1024 * 1024;

function deriveFormat(filename: string): "markdown" | "latex" | null {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".md") return "markdown";
  if (ext === ".tex") return "latex";
  return null;
}

function defaultTitle(filename: string): string {
  const parsed = path.parse(filename);
  return parsed.name.trim() || "Imported project";
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }
    if (!file.name.trim()) {
      return NextResponse.json({ error: "Imported file must have a name." }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_SIZE) {
      return NextResponse.json({ error: "Imported file is too large (max 2MB)." }, { status: 400 });
    }

    const format = deriveFormat(file.name);
    if (!format) {
      return NextResponse.json({ error: "Only .md and .tex files are supported." }, { status: 400 });
    }

    const titleInput = String(form.get("title") || "").trim();
    const title = titleInput || defaultTitle(file.name);
    const content = await file.text();
    const project = await createProject(user.id, title, format, "blank", content);
    await ensureProjectWorkspace(project.id);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import project.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
