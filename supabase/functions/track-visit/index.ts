// track-visit — one page view per load, against the browser's session.
// Bots are dropped up front; nothing raw about the visitor is stored.

import { admin, clientIp, cors, hashIp, json, rateLimited, resolveEnv, resolveSession, text, validToken } from "../_shared/common.ts";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|go-http/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  if (BOT.test(req.headers.get("user-agent") ?? "")) return json(req, 200, { ok: true, bot: true });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, 400, { error: "json" }); }
  if (!validToken(body.token)) return json(req, 400, { error: "token" });

  const db = admin();
  const ipHash = await hashIp(clientIp(req));
  const wait = await rateLimited(db, [`visit:${ipHash}`], 60, 60);
  if (wait) return json(req, 429, { error: "rate" }, { "Retry-After": String(wait) });

  const env = resolveEnv(req, body.env);
  const sessionId = await resolveSession(db, req, body.token, env, ipHash);
  await db.from("page_views").insert({
    env, session_id: sessionId,
    page: text(body.page, 300) || "/",
    referrer: text(body.referrer, 500) || null,
  });
  return json(req, 200, { ok: true });
});
