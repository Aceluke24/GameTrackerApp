// Supabase Edge Function: IGDB proxy
// ─────────────────────────────────────────────────────────────────────────────
// Why this exists: IGDB's API needs a Twitch app access token, minted from
// our Twitch Client ID + Client SECRET. That secret must never ship inside
// the desktop app — anyone can unzip an Electron build and read it — so it
// lives here as a Supabase secret instead. The app tells us which IGDB
// endpoint + query it wants; we attach the credentials and forward it.
//
// Auth: `verify_jwt` is on (see supabase/config.toml), so Supabase rejects
// any request without a valid signed-in-user token before our code even
// runs. That keeps our IGDB rate quota spendable only by real Game Vault
// users, not anyone who finds this URL.
//
// Deploy:  supabase functions deploy igdb
// Secrets: supabase secrets set IGDB_CLIENT_ID=... IGDB_CLIENT_SECRET=...

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";

// Only the endpoints the app actually uses. Anything else is rejected so
// this can't be repurposed as an open IGDB proxy.
const ALLOWED_ENDPOINTS = new Set(["games", "game_time_to_beats"]);

const CLIENT_ID = Deno.env.get("IGDB_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("IGDB_CLIENT_SECRET");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// ─── Twitch token cache ──────────────────────────────────────────────────────
// Twitch app access tokens last ~60 days. Cache the current one in module
// memory — it survives as long as this function instance stays warm — and
// re-mint when it's missing or within a day of expiring. A cold start just
// mints a fresh one: one extra request, no big deal.
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getTwitchToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return tokenCache.value;
  }
  const res = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.value;
}

function igdbFetch(endpoint: string, query: string, token: string): Promise<Response> {
  return fetch(`${IGDB_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID!,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({ error: "IGDB credentials are not configured on the server." }, 500);
  }

  let endpoint: unknown, query: unknown;
  try {
    ({ endpoint, query } = await req.json());
  } catch {
    return json({ error: "Body must be JSON: { endpoint, query }." }, 400);
  }
  if (typeof endpoint !== "string" || !ALLOWED_ENDPOINTS.has(endpoint) || typeof query !== "string") {
    return json({ error: `Endpoint "${endpoint}" is not allowed.` }, 400);
  }

  try {
    let token = await getTwitchToken();
    let res = await igdbFetch(endpoint, query, token);

    // Token revoked out-of-band → drop the cache and retry once, fresh.
    if (res.status === 401) {
      tokenCache = null;
      token = await getTwitchToken();
      res = await igdbFetch(endpoint, query, token);
    }

    // IGDB caps requests at ~4/sec. Retry a rate-limited call a few times
    // with backoff here, server-side, instead of pushing that onto every
    // client — the limit is app-wide, not per user.
    for (let attempt = 1; res.status === 429 && attempt <= 3; attempt++) {
      await new Promise((r) => setTimeout(r, 750 * attempt));
      res = await igdbFetch(endpoint, query, token);
    }

    // Pass IGDB's response (body + status) straight through.
    return new Response(await res.text(), {
      status: res.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});
