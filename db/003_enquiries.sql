-- ============================================================
--  003 — enquiries: about one work, or an artist's studio.
--  Private (RLS-on, no policies); written by the `enquiry` function.
-- ============================================================

CREATE TABLE IF NOT EXISTS enquiries (
  id             BIGSERIAL    PRIMARY KEY,
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),
  session_id     BIGINT       NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  work_id        BIGINT       REFERENCES works(id) ON DELETE SET NULL,     -- set for a work enquiry
  artist_id      BIGINT       REFERENCES artists(id) ON DELETE SET NULL,   -- always set
  subject        TEXT         NOT NULL,   -- the heading as the visitor saw it
  name           TEXT         NOT NULL,
  email          TEXT         NOT NULL,
  message        TEXT         NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_session_id_idx ON enquiries (session_id);
CREATE INDEX IF NOT EXISTS enquiries_work_id_idx    ON enquiries (work_id);
CREATE INDEX IF NOT EXISTS enquiries_artist_id_idx  ON enquiries (artist_id);
