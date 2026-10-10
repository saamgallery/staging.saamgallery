// order — a visitor's held works, placed as one order.
// Prices and availability come from the catalogue, never the browser.

import { admin, clientIp, cors, EMAIL, hashIp, json, rateLimited, resolveEnv, resolveSession, text, validToken } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, 400, { error: "json" }); }

  if (text(body.website, 200)) return json(req, 200, { ok: true });   // honeypot

  if (!validToken(body.token)) return json(req, 400, { error: "token" });
  const f = {
    name: text(body.name, 200),
    email: text(body.email, 320),
    address: text(body.address, 500),
    city: text(body.city, 200),
    country: text(body.country, 200),
  };
  if (!f.name || !f.address || !f.city || !f.country || !EMAIL.test(f.email)) {
    return json(req, 400, { error: "fields" });
  }

  const ids = Array.isArray(body.work_ids)
    ? [...new Set(body.work_ids.filter((n) => Number.isInteger(n)))] as number[]
    : [];
  if (ids.length === 0 || ids.length > 20) return json(req, 400, { error: "works" });

  const db = admin();
  const ipHash = await hashIp(clientIp(req));
  const wait = await rateLimited(db, [`order:${ipHash}`, `order:sess:${body.token}`], 5, 3600);
  if (wait) return json(req, 429, { error: "rate" }, { "Retry-After": String(wait) });

  const env = resolveEnv(req, body.env);
  const { data: works, error: worksError } = await db.from("works")
    .select("id, title, price, available").in("id", ids).eq("env", env);
  if (worksError) return json(req, 500, { error: "store" });

  const unavailable = ids.filter((id) => !works!.some((w) => w.id === id && w.available));
  if (unavailable.length) return json(req, 409, { error: "unavailable", work_ids: unavailable });

  const sessionId = await resolveSession(db, req, body.token, env, ipHash);
  const total = works!.reduce((sum, w) => sum + w.price, 0);

  const { data: order, error } = await db.from("orders")
    .insert({ env, session_id: sessionId, ...f, total }).select("id").single();
  if (error) return json(req, 500, { error: "store" });

  const { error: itemsError } = await db.from("order_items").insert(
    works!.map((w) => ({ order_id: order.id, work_id: w.id, title: w.title, price: w.price })),
  );
  if (itemsError) {
    await db.from("orders").delete().eq("id", order.id);
    return json(req, 500, { error: "store" });
  }
  return json(req, 200, { ok: true, order_id: order.id, total });
});
