import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth";
import { logout } from "@/lib/server/db";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      await logout(token);
    }
    store.delete(AUTH_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

