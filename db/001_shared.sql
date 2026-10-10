-- ============================================================
--  001 — shared tables: rate limiting, sessions, page views.
--  Canonical across every unframe app; copied unchanged.
--  All RLS-on with no policies: the edge functions (service role)
--  are the only way in.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;   -- service role only

CREATE OR REPLACE FUNCTION rate_limit_hit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS TABLE (allowed BOOLEAN, remaining INT, retry_after INT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_bucket TIMESTAMPTZ; v_count INT;
BEGIN
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  INSERT INTO rate_limits (key, window_start, count) VALUES (p_key, v_bucket, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO v_count;
  allowed     := v_count <= p_limit;
  remaining   := greatest(0, p_limit - v_count);
  retry_after := CASE WHEN v_count <= p_limit THEN 0
    ELSE ceil(extract(epoch FROM (v_bucket + make_interval(secs => p_window_seconds)) - now()))::INT END;
  RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT, INT) TO service_role;

CREATE TABLE IF NOT EXISTS sessions (
  id             BIGSERIAL    PRIMARY KEY,
  token          UUID         NOT NULL UNIQUE,       -- browser's localStorage identifier
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),
  ip_hash        TEXT         NOT NULL,
  country        CHAR(2),               -- ISO 3166-1 alpha-2; NULL if unknown
  continent      CHAR(2),
  city           TEXT,
  latitude       DOUBLE PRECISION,      -- city-level
  longitude      DOUBLE PRECISION,      -- city-level
  timezone       TEXT,                  -- IANA
  asorg          TEXT,                  -- ISP / network (bot-filtering signal)
  user_agent     TEXT,
  first_seen     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- first sight; set once, never bumped
  last_seen      TIMESTAMPTZ  NOT NULL DEFAULT NOW()    -- bumped on every return visit
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS page_views (
  id             BIGSERIAL    PRIMARY KEY,
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),
  session_id     BIGINT       NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  page           TEXT         NOT NULL DEFAULT '/',
  referrer       TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS page_views_session_id_idx ON page_views (session_id);
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views (created_at DESC);
