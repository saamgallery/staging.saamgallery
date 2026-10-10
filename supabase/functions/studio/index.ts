// studio — an artist's own record and works.
//
// Who the caller is acting as comes from _shared/artist.ts: their own
// artist row when signed in, or — on staging only — the artist the
// request names. Only that artist's rows are ever changed.
//
// Every action answers with the rows as stored, so the browser can
// update its cache from the source of truth. Photographs are handled
// by the `work-image` function.

import { admin, cors, json, text } from "../_shared/common.ts";
import { ARTIST_COLS, BUCKET, ownWork, resolveArtist, WORK_COLS } from "../_shared/artist.ts";

function artistFields(v: Record<string, unknown>) {
  let instagram = text(v.instagram, 100);
  if (instagram && !instagram.startsWith("@")) instagram = "@" + instagram;
  const row = {
    name: text(v.name, 200), medium: text(v.medium, 200), based: text(v.based, 200),
    instagram, short: text(v.short, 300), bio: text(v.bio, 5000),
  };
  return row.name ? row : null;
}

function workFields(v: Record<string, unknown>) {
  const price = Number(v.price);
  const row = {
    title: text(v.title, 300), year: text(v.year, 20), medium: text(v.medium, 200),
    size: text(v.size, 100),
    price: Number.isFinite(price) ? Math.max(0, Math.min(2_000_000_000, Math.round(price))) : 0,
    available: v.available === true,
  };
  return row.title ? row : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, 400, { error: "json" }); }

  const db = admin();
  const who = await resolveArtist(req, db, body.env, body.artist_id);
  if (who instanceof Response) return who;
  const { me, env } = who;
  const now = new Date().toISOString();

  switch (body.action) {
    case "me":
      return json(req, 200, { artist: me });

    case "update_artist": {
      const row = artistFields((body.artist ?? {}) as Record<string, unknown>);
      if (!row) return json(req, 400, { error: "fields" });
      const { data, error } = await db.from("artists").update({ ...row, updated_at: now })
        .eq("id", me.id).select(ARTIST_COLS).single();
      if (error) return json(req, 500, { error: "store" });
      return json(req, 200, { artist: data });
    }

    case "create_work": {
      const row = workFields((body.work ?? {}) as Record<string, unknown>);
      if (!row) return json(req, 400, { error: "fields" });
      const { data, error } = await db.from("works").insert({ ...row, env, artist_id: me.id })
        .select(WORK_COLS).single();
      if (error) return json(req, 500, { error: "store" });
      return json(req, 200, { work: data });
    }

    case "update_work": {
      const row = workFields((body.work ?? {}) as Record<string, unknown>);
      if (!row) return json(req, 400, { error: "fields" });
      if (!(await ownWork(db, me, body.id))) return json(req, 404, { error: "work" });
      const { data, error } = await db.from("works").update({ ...row, updated_at: now })
        .eq("id", body.id).select(WORK_COLS).single();
      if (error) return json(req, 500, { error: "store" });
      return json(req, 200, { work: data });
    }

    case "delete_work": {
      const work = await ownWork(db, me, body.id);
      if (!work) return json(req, 404, { error: "work" });
      const { error } = await db.from("works").delete().eq("id", work.id);
      if (error) return json(req, 500, { error: "store" });
      if (work.image) await db.storage.from(BUCKET).remove([work.image]);
      return json(req, 200, { ok: true });
    }

    default:
      return json(req, 400, { error: "action" });
  }
});
