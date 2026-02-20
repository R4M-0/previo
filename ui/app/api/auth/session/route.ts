import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/server/auth";

export async function GET() {
  try {
    const user = await requireAuthUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

