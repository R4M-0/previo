import { NextResponse } from "next/server";
import { getProject } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";
import {
  deleteWorkspaceFile,
  listWorkspaceFiles,
  saveWorkspaceFile,
} from "@/lib/server/workspace";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    await getProject(user.id, id);
    const files = await listWorkspaceFiles(id);
    return NextResponse.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list workspace files.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    await getProject(user.id, id);

    const form = await request.formData();
    const uploaded = form.get("file");
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }
    if (!uploaded.name.trim()) {
      return NextResponse.json({ error: "Uploaded file must have a name." }, { status: 400 });
    }
    if (uploaded.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 400 });
    }

    const content = Buffer.from(await uploaded.arrayBuffer());
    const file = await saveWorkspaceFile(id, uploaded.name, content);
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    await getProject(user.id, id);

    const { searchParams } = new URL(request.url);
    const filePath = (searchParams.get("path") || "").trim();
    if (!filePath) {
      return NextResponse.json({ error: "Missing file path." }, { status: 400 });
    }
    await deleteWorkspaceFile(id, filePath);
    return NextResponse.json({ deleted: true, path: filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete file.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
