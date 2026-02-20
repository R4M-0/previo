import { NextResponse } from "next/server";
import { addCollaborator } from "@/lib/server/db";
import { requireAuthUser } from "@/lib/server/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await context.params;
    const body = (await request.json()) as { email?: string };
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Missing required field: email" }, { status: 400 });
    }

    const collaborator = await addCollaborator(user.id, id, email);
    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add collaborator.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("not found")
        ? 404
        : lower.includes("already") || lower.includes("owner")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
