import path from "node:path";
import { NextResponse } from "next/server";
import { getProject } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";
import { readWorkspaceFile } from "@/lib/server/workspace";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".tex": "application/x-tex; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export async function GET(
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

    const file = await readWorkspaceFile(id, filePath);
    const ext = path.extname(file.name).toLowerCase();
    const type = MIME_BY_EXT[ext] || "application/octet-stream";

    return new NextResponse(file.data, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${file.name}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read workspace file.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
