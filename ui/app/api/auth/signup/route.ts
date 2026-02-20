import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth";
import { login, signup } from "@/lib/server/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }

    await signup({ name, email, password });
    const loginResult = await login({ email, password });

    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, loginResult.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return NextResponse.json({ user: loginResult.user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed.";
    const lower = message.toLowerCase();
    const status = lower.includes("exists") || lower.includes("missing") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

