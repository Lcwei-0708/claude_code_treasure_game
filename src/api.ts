// Thin client for the SQLite-backed API in server/index.mjs (proxied at /api by Vite).

export interface User {
  id: number;
  username: string;
}

export interface ScoreSummary {
  best: number | null;
  games: number;
  recent: { score: number; played_at: string }[];
}

const TOKEN_KEY = 'treasure_token';

// Read the stored session token; returns null if absent or storage is unavailable
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// Store (or clear, when null) the session token
function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable: session lasts until reload */ }
}

// Call an API endpoint with the session token; returns parsed JSON or throws Error(message)
async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  // A non-JSON 5xx means the Vite proxy could not reach the API server at all
  if (data === null && res.status >= 500) throw new Error('Cannot reach the game server. Is it running?');
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

// Create an account and sign in; input username/password, returns the new user
export async function signUp(username: string, password: string): Promise<User> {
  const { token, user } = await request<{ token: string; user: User }>('POST', '/api/signup', { username, password });
  setToken(token);
  return user;
}

// Sign in with existing credentials; input username/password, returns the user
export async function signIn(username: string, password: string): Promise<User> {
  const { token, user } = await request<{ token: string; user: User }>('POST', '/api/signin', { username, password });
  setToken(token);
  return user;
}

// Invalidate the current session on the server and forget the token locally
export async function signOut(): Promise<void> {
  await request('POST', '/api/signout').catch(() => {});
  setToken(null);
}

// Restore the signed-in user from the stored token; returns null if not signed in
export async function fetchMe(): Promise<{ user: User; scores: ScoreSummary } | null> {
  if (!getToken()) return null;
  try {
    return await request('GET', '/api/me');
  } catch {
    setToken(null);
    return null;
  }
}

// Save a finished game's score for the signed-in user; returns the updated summary
export async function saveScore(score: number): Promise<ScoreSummary> {
  const { scores } = await request<{ scores: ScoreSummary }>('POST', '/api/scores', { score });
  return scores;
}
