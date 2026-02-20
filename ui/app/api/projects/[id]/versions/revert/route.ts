import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/server/auth";
import { revertProjectVersion } from "@/lib/server/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const body = (await request.json()) as { versionId?: string };
    const versionId = typeof body.versionId === "string" ? body.versionId.trim() : "";

    if (!versionId) {
      return NextResponse.json(
        { error: "Missing required field: versionId" },
        { status: 400 }
      );
    }

    const project = await revertProjectVersion(user.id, id, versionId);
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revert version.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("not found") || lower.includes("missing")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

