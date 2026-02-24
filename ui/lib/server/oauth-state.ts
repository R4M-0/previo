type OAuthStateEntry = {
  nextPath: string;
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;

function getStore(): Map<string, OAuthStateEntry> {
  const globalKey = "__previo_oauth_state_store__";
  const globalObj = globalThis as typeof globalThis & {
    [globalKey]?: Map<string, OAuthStateEntry>;
  };
  if (!globalObj[globalKey]) {
    globalObj[globalKey] = new Map<string, OAuthStateEntry>();
  }
  return globalObj[globalKey]!;
}

function cleanupExpired(store: Map<string, OAuthStateEntry>) {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function createOAuthState(nextPath: string): string {
  const state = `${crypto.randomUUID()}-${Date.now()}`;
  const store = getStore();
  cleanupExpired(store);
  store.set(state, { nextPath, expiresAt: Date.now() + TTL_MS });
  return state;
}

export function consumeOAuthState(state: string): string | null {
  const store = getStore();
  cleanupExpired(store);
  const entry = store.get(state);
  if (!entry) {
    return null;
  }
  store.delete(state);
  return entry.nextPath;
}
