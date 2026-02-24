export type OAuthProvider = "google" | "github";

type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
};

function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["openid", "email", "profile"],
    };
  }

  return {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"],
  };
}

function requireOAuthConfig(config: OAuthProviderConfig, provider: OAuthProvider): void {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth is not configured for ${provider}.`);
  }
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname === "0.0.0.0" ? "localhost" : url.hostname;
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${host}${port}`;
}

export function buildOAuthStartUrl(
  request: Request,
  provider: OAuthProvider,
  state: string
): string {
  const config = getProviderConfig(provider);
  requireOAuthConfig(config, provider);
  const baseUrl = getBaseUrl(request);

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });
  if (provider === "google") {
    const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`;
    params.set("redirect_uri", redirectUri);
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  return `${config.authorizeUrl}?${params.toString()}`;
}

async function exchangeCodeForToken(
  request: Request,
  provider: OAuthProvider,
  code: string
): Promise<string> {
  const config = getProviderConfig(provider);
  requireOAuthConfig(config, provider);
  const tokenParams = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
  });
  if (provider === "google") {
    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/auth/oauth/${provider}/callback`;
    tokenParams.set("redirect_uri", redirectUri);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenParams.toString(),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || `Failed to exchange ${provider} OAuth code.`);
  }
  return data.access_token;
}

type OAuthProfile = {
  providerUserId: string;
  email: string;
  name: string;
};

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
  };
  if (!response.ok || !data.sub || !data.email) {
    throw new Error("Failed to fetch Google profile.");
  }
  return {
    providerUserId: data.sub,
    email: data.email,
    name: data.name || data.email.split("@")[0],
  };
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "previo-app",
    },
  });
  const user = (await userRes.json()) as { id?: number; login?: string; name?: string; email?: string };
  if (!userRes.ok || !user.id) {
    throw new Error("Failed to fetch GitHub profile.");
  }

  let email = user.email || "";
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "previo-app",
      },
    });
    const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primary = emails.find((entry) => entry.primary && entry.verified) || emails.find((entry) => entry.verified);
    email = primary?.email || "";
  }
  if (!email) {
    throw new Error("GitHub account has no verified email.");
  }

  return {
    providerUserId: String(user.id),
    email,
    name: user.name || user.login || email.split("@")[0],
  };
}

export async function getOAuthProfileFromCode(
  request: Request,
  provider: OAuthProvider,
  code: string
): Promise<OAuthProfile> {
  const accessToken = await exchangeCodeForToken(request, provider, code);
  if (provider === "google") {
    return fetchGoogleProfile(accessToken);
  }
  return fetchGithubProfile(accessToken);
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}
