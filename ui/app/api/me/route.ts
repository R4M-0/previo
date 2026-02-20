import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/server/auth";
import { updateMe } from "@/lib/server/db";

export async function GET() {
  try {
    const user = await requireAuthUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const updatedUser = await updateMe({
      userId: user.id,
      name: body.name,
      email: body.email,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    const lower = message.toLowerCase();
    const status = lower.includes("unauthorized")
      ? 401
      : lower.includes("exists") ||
          lower.includes("incorrect") ||
          lower.includes("required") ||
          lower.includes("cannot")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
