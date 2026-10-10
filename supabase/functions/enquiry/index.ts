// enquiry — an enquiry about one work, or about an artist's studio.

import { admin, clientIp, cors, EMAIL, hashIp, json, rateLimited, resolveEnv, resolveSession, text, validToken } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, 400, { error: "json" }); }

  // honeypot: a field people never see. Filled → pretend it worked.
  if (text(body.website, 200)) return json(req, 200, { ok: true });

  if (!validToken(body.token)) return json(req, 400, { error: "token" });
  const name = text(body.name, 200);
  const email = text(body.email, 320);
  const message = text(body.message, 5000);
  if (!name || !message || !EMAIL.test(email)) return json(req, 400, { error: "fields" });

  const db = admin();
  const ipHash = await hashIp(clientIp(req));
  const wait = await rateLimited(db, [`enquiry:${ipHash}`, `enquiry:sess:${body.token}`], 5, 600);
  if (wait) return json(req, 429, { error: "rate" }, { "Retry-After": String(wait) });

  const env = resolveEnv(req, body.env);

  // The subject is built here from the catalogue (this env's), not taken from the browser.
  let workId: number | null = null;
  let artistId: number | null = null;
  let subject = "";
  if (Number.isInteger(body.work_id)) {
    const { data: w } = await db.from("works").select("id, title, artist_id, artists(name)")
      .eq("id", body.work_id).eq("env", env).maybeSingle();
    if (!w) return json(req, 400, { error: "work" });
    workId = w.id; artistId = w.artist_id;
    // deno-lint-ignore no-explicit-any
    subject = `${w.title} — ${(w as any).artists?.name ?? ""}`;
  } else if (Number.isInteger(body.artist_id)) {
    const { data: a } = await db.from("artists").select("id, name").eq("id", body.artist_id).eq("env", env).maybeSingle();
    if (!a) return json(req, 400, { error: "artist" });
    artistId = a.id;
    subject = `Studio enquiry — ${a.name}`;
  } else {
    return json(req, 400, { error: "subject" });
  }

  const sessionId = await resolveSession(db, req, body.token, env, ipHash);
  const { error } = await db.from("enquiries").insert({
    env, session_id: sessionId, work_id: workId, artist_id: artistId, subject, name, email, message,
  });
  if (error) return json(req, 500, { error: "store" });
  return json(req, 200, { ok: true });
});
