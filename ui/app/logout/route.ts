import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/server/auth";
import { logout } from "@/lib/server/db";

async function clearSession(request: Request): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    try {
      await logout(token);
    } catch {
      // Continue and clear cookie even if session deletion fails.
    }
  }

  store.delete(AUTH_COOKIE_NAME);
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === "0.0.0.0") {
    requestUrl.hostname = "localhost";
  }
  requestUrl.pathname = "/login";
  requestUrl.search = "";
  return NextResponse.redirect(requestUrl);
}

export async function GET(request: Request) {
  return clearSession(request);
}

export async function POST(request: Request) {
  return clearSession(request);
}
