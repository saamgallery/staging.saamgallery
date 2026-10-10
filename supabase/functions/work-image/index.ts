// work-image — set or remove the photograph of one work.
//
// multipart/form-data: work_id, env, (staging only) artist_id, and
// either `file` (a JPEG or PNG) or `remove=1`. The caller must own the
// work (see _shared/artist.ts). The image is scaled to at most
// MAX_EDGE px on its long side, re-encoded as JPEG, and stored in the
// public `artworks` bucket at <env>/<work id>/<uuid>.jpg — a fresh
// name each time, so no cache ever serves the old picture. The image
// it replaces is deleted. Answers with the work row as stored.

import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { admin, cors, json } from "../_shared/common.ts";
import { BUCKET, ownWork, resolveArtist, WORK_COLS } from "../_shared/artist.ts";

const MAX_EDGE = 1600;          // px, long side of the stored image
const QUALITY = 82;             // JPEG
const MAX_UPLOAD = 12 * 1024 * 1024;

function int(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v !== null && Number.isInteger(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });

  let form: FormData;
  try { form = await req.formData(); } catch { return json(req, 400, { error: "form" }); }

  const db = admin();
  const who = await resolveArtist(req, db, int(form.get("env")), int(form.get("artist_id")));
  if (who instanceof Response) return who;
  const { me, env } = who;

  const work = await ownWork(db, me, int(form.get("work_id")));
  if (!work) return json(req, 404, { error: "work" });

  let path: string | null = null;
  if (form.get("remove") !== "1") {
    const file = form.get("file");
    if (!(file instanceof File)) return json(req, 400, { error: "file" });
    if (file.size > MAX_UPLOAD) return json(req, 413, { error: "too_large" });

    let image: Image;
    try {
      const decoded = await Image.decode(new Uint8Array(await file.arrayBuffer()));
      if (!(decoded instanceof Image)) throw new Error("not a still image");
      image = decoded;
    } catch {
      return json(req, 415, { error: "format" });
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    if (scale < 1) {
      image = image.resize(Math.round(image.width * scale), Math.round(image.height * scale));
    }
    const jpeg = await image.encodeJPEG(QUALITY);

    path = `${env}/${work.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await db.storage.from(BUCKET).upload(path, jpeg, {
      contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
    });
    if (error) return json(req, 500, { error: "store" });
  }

  const { data, error } = await db.from("works")
    .update({ image: path, updated_at: new Date().toISOString() })
    .eq("id", work.id).select(WORK_COLS).single();
  if (error) {
    if (path) await db.storage.from(BUCKET).remove([path]);
    return json(req, 500, { error: "store" });
  }
  if (work.image && work.image !== path) await db.storage.from(BUCKET).remove([work.image]);
  return json(req, 200, { work: data });
});
