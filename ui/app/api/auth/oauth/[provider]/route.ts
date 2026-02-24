import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildOAuthStartUrl, isOAuthProvider } from "@/lib/server/oauth";
import { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE } from "@/lib/server/auth";
import { createOAuthState } from "@/lib/server/oauth-state";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await context.params;
    if (!isOAuthProvider(provider)) {
      return NextResponse.json({ error: "Unsupported OAuth provider." }, { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const nextPath = requestUrl.searchParams.get("next") || "/dashboard";
    const state = createOAuthState(nextPath);
    const redirectUrl = buildOAuthStartUrl(request, provider, state);

    const store = await cookies();
    store.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    store.set(OAUTH_NEXT_COOKIE, nextPath, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start OAuth flow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
