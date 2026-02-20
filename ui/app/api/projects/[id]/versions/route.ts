import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/server/auth";
import { listProjectVersions } from "@/lib/server/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const versions = await listProjectVersions(user.id, id);
    return NextResponse.json({ versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch versions.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized") ? 401 : lower.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

