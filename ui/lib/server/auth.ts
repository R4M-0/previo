import { cookies } from "next/headers";
import { getUserBySession } from "@/lib/server/db";
import { User } from "@/types";

export const AUTH_COOKIE_NAME = "previo_session";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function requireAuthUser(): Promise<User> {
  const token = await getSessionToken();
  if (!token) {
    throw new Error("Unauthorized");
  }
  try {
    return await getUserBySession(token);
  } catch {
    throw new Error("Unauthorized");
  }
}
