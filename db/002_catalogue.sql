-- ============================================================
--  002 — the catalogue: artists and their works.
--
--  This is the one deliberately public table pair: the site exists to
--  publish it, so both get a read policy and are read straight from
--  PostgREST with the publishable key. The one private column,
--  artists.user_id (the artist's login), is kept out of the public
--  column grant.
--
--  Writes never come from the browser directly: the `studio` edge
--  function (service role) checks the signed-in user owns the row.
--
--  Both tables carry `env` (0 = staging, 1 = production), so the two
--  builds keep separate catalogues in one database: an edit made on
--  staging never reaches the live site. Each build reads only its own
--  rows (`env=eq.<DB_ENV>`), and the edge functions scope every lookup
--  and write to the caller's env.
-- ============================================================

CREATE TABLE IF NOT EXISTS artists (
  id             BIGSERIAL    PRIMARY KEY,
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),
  user_id        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,  -- private: the artist's login
  name           TEXT         NOT NULL,
  medium         TEXT         NOT NULL DEFAULT '',
  based          TEXT         NOT NULL DEFAULT '',
  instagram      TEXT         NOT NULL DEFAULT '',
  short          TEXT         NOT NULL DEFAULT '',
  bio            TEXT         NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, env)       -- one login owns one artist row per environment
);
CREATE INDEX IF NOT EXISTS artists_env_idx ON artists (env);

CREATE TABLE IF NOT EXISTS works (
  id             BIGSERIAL    PRIMARY KEY,
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),   -- always its artist's env
  artist_id      BIGINT       NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title          TEXT         NOT NULL,
  year           TEXT         NOT NULL DEFAULT '',
  medium         TEXT         NOT NULL DEFAULT '',
  size           TEXT         NOT NULL DEFAULT '',
  price          INTEGER      NOT NULL DEFAULT 0 CHECK (price >= 0),   -- rands
  available      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS works_artist_id_idx ON works (artist_id);
CREATE INDEX IF NOT EXISTS works_env_idx       ON works (env);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE works   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON artists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON works   FOR SELECT TO anon, authenticated USING (true);

-- Read-only, and for artists only the public columns.
REVOKE ALL ON artists, works FROM anon, authenticated;
GRANT SELECT (id, env, name, medium, based, instagram, short, bio) ON artists TO anon, authenticated;
GRANT SELECT ON works TO anon, authenticated;
