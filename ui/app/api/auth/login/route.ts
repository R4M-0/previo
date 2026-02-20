import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth";
import { login } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, password" },
        { status: 400 }
      );
    }

    const result = await login({ email, password });
    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return NextResponse.json({ user: result.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    const status = message.toLowerCase().includes("invalid") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

