// ============================================================
//  Shared by every SAAM edge function: CORS, the service-role
//  client, env resolution, IP hashing, rate limiting, and resolving
//  the browser's session before an interaction row is written.
// ============================================================

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

// Origins allowed to call the functions. github.io serves both the
// staging and (later) production repos from one origin, so there env
// falls back to the build stamp; the custom domains resolve it here.
const ALLOWED_ORIGINS = [
  "https://saamgallery.github.io",
  "https://staging.saam.gallery",
  "https://saam.gallery",
  "https://www.saam.gallery",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

const ENV_BY_ORIGIN: Record<string, number> = {
  "https://staging.saam.gallery": 0,
  "https://saam.gallery": 1,
  "https://www.saam.gallery": 1,
};

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", ...extra },
  });
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

// Server-trusted origin first; the build stamp only where the origin
// can't tell staging from production. Anything unexpected is staging.
export function resolveEnv(req: Request, claimed: unknown): number {
  const origin = req.headers.get("origin") ?? "";
  if (origin in ENV_BY_ORIGIN) return ENV_BY_ORIGIN[origin];
  return claimed === 1 ? 1 : 0;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode((Deno.env.get("IP_HASH_SALT") ?? "") + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Fixed-window counter in Postgres. Fails open: a broken limiter
// must not block real visitors.
export async function rateLimited(
  db: SupabaseClient, keys: string[], limit: number, windowSeconds: number,
): Promise<number> {
  for (const key of keys) {
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
    });
    if (error || !data?.[0]) continue;
    if (!data[0].allowed) return data[0].retry_after || windowSeconds;
  }
  return 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validToken(token: unknown): token is string {
  return typeof token === "string" && UUID.test(token);
}

// Find the browser's session by token, creating a minimal one on
// first sight (geolocated once, then), and return its id.
export async function resolveSession(
  db: SupabaseClient, req: Request, token: string, env: number, ipHash: string,
): Promise<number> {
  const { data: found } = await db.from("sessions").select("id").eq("token", token).maybeSingle();
  if (found) {
    await db.from("sessions").update({ last_seen: new Date().toISOString() }).eq("id", found.id);
    return found.id;
  }
  const geo = await geolocate(clientIp(req));
  const { data, error } = await db.from("sessions").insert({
    token, env, ip_hash: ipHash, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 400), ...geo,
  }).select("id").single();
  if (error) {
    // lost a race with a parallel first request from the same browser
    const { data: again } = await db.from("sessions").select("id").eq("token", token).single();
    return again!.id;
  }
  return data.id;
}

async function geolocate(ip: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return {};
    const g = await res.json();
    if (g.error) return {};
    return {
      country: g.country_code ?? null, continent: g.continent_code ?? null, city: g.city ?? null,
      latitude: g.latitude ?? null, longitude: g.longitude ?? null,
      timezone: g.timezone ?? null, asorg: g.org ?? null,
    };
  } catch {
    return {};
  }
}

// Trimmed text, clamped; "" when missing.
export function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
