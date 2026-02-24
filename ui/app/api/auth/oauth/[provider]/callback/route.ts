import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE } from "@/lib/server/auth";
import { oauthLogin } from "@/lib/server/db";
import { getOAuthProfileFromCode, isOAuthProvider } from "@/lib/server/oauth";
import { consumeOAuthState } from "@/lib/server/oauth-state";

function buildRedirect(base: string, path: string): string {
  const safePath = path.startsWith("/") ? path : "/dashboard";
  return `${base}${safePath}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const requestUrl = new URL(request.url);
  const host =
    requestUrl.hostname === "0.0.0.0"
      ? `localhost${requestUrl.port ? `:${requestUrl.port}` : ""}`
      : requestUrl.host;
  const base = `${requestUrl.protocol}//${host}`;
  const code = requestUrl.searchParams.get("code") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const oauthError = requestUrl.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value || "";
  const cookieNextPath = store.get(OAUTH_NEXT_COOKIE)?.value || "/dashboard";
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_NEXT_COOKIE);
  const storedNextPath = state ? consumeOAuthState(state) : null;
  const nextPath = storedNextPath || cookieNextPath;

  const fail = (message: string) => {
    const loginUrl = new URL(`${base}/login`);
    loginUrl.searchParams.set("error", message);
    return NextResponse.redirect(loginUrl.toString());
  };

  try {
    const { provider } = await context.params;
    if (!isOAuthProvider(provider)) {
      return fail("Unsupported OAuth provider.");
    }
    if (oauthError) {
      return fail(`OAuth failed: ${oauthError}`);
    }
    const stateOk = Boolean(
      state && (storedNextPath !== null || (expectedState && state === expectedState))
    );
    if (!code || !stateOk) {
      return fail("Invalid OAuth state.");
    }

    const profile = await getOAuthProfileFromCode(request, provider, code);
    const result = await oauthLogin({
      provider,
      providerUserId: profile.providerUserId,
      email: profile.email,
      name: profile.name,
    });

    store.set(AUTH_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return NextResponse.redirect(buildRedirect(base, nextPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed.";
    return fail(message);
  }
}
