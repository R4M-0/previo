import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/server/auth";
import { listInvitations, respondInvitation } from "@/lib/server/db";

export async function GET() {
  try {
    const user = await requireAuthUser();
    const invitations = await listInvitations(user.id);
    return NextResponse.json({ invitations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch invitations.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = (await request.json()) as {
      invitationId?: string;
      decision?: "accept" | "deny";
    };
    const invitationId =
      typeof body.invitationId === "string" ? body.invitationId.trim() : "";
    const decision = body.decision;

    if (!invitationId || (decision !== "accept" && decision !== "deny")) {
      return NextResponse.json(
        { error: "Missing required fields: invitationId, decision" },
        { status: 400 }
      );
    }

    const result = await respondInvitation(user.id, invitationId, decision);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to respond invitation.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("not found") || lower.includes("allowed")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

