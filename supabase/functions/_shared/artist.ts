// ============================================================
//  Who is this request acting as? Shared by `studio` and
//  `work-image`.
//
//  With a Supabase Auth access token: the artist row whose user_id
//  matches, in the caller's env. Without one: staging only — the
//  request names the artist (`artist_id`) and only an env 0 row is
//  accepted. Production rows always need the artist's own login.
// ============================================================

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { clientIp, hashIp, json, rateLimited, resolveEnv } from "./common.ts";

export const ARTIST_COLS = "id, name, medium, based, instagram, short, bio";
export const WORK_COLS = "id, artist_id, title, year, medium, size, price, available, image";

export type Artist = { id: number; [key: string]: unknown };

// Resolves to the artist and env, or to the error Response to send.
export async function resolveArtist(
  req: Request, db: SupabaseClient, claimedEnv: unknown, artistId: unknown,
): Promise<{ me: Artist; env: number } | Response> {
  const env = resolveEnv(req, claimedEnv);

  // A publishable key is not a login: only a user's access token counts.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = jwt.startsWith("eyJ") ? await db.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user && (env !== 0 || !Number.isInteger(artistId))) return json(req, 401, { error: "auth" });

  const who = user ? user.id : "staging:" + await hashIp(clientIp(req));
  const wait = await rateLimited(db, [`studio:${who}`], 120, 60);
  if (wait) return json(req, 429, { error: "rate" }, { "Retry-After": String(wait) });

  const { data: me } = user
    ? await db.from("artists").select(ARTIST_COLS).eq("user_id", user.id).eq("env", env).maybeSingle()
    : await db.from("artists").select(ARTIST_COLS).eq("id", artistId).eq("env", 0).maybeSingle();
  if (!me) return json(req, 403, { error: "no_artist" });
  return { me, env };
}

// A work, only if it belongs to this artist.
export async function ownWork(db: SupabaseClient, me: Artist, id: unknown) {
  if (!Number.isInteger(id)) return null;
  const { data } = await db.from("works").select(WORK_COLS)
    .eq("id", id).eq("artist_id", me.id).maybeSingle();
  return data;
}

export const BUCKET = "artworks";
