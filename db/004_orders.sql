-- ============================================================
--  004 — orders and the works on them.
--  Private (RLS-on, no policies); written by the `order` function,
--  which prices the works itself rather than trusting the browser.
--  No payment details are stored — the gallery follows up by email.
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL    PRIMARY KEY,
  env            SMALLINT     NOT NULL CHECK (env IN (0, 1)),
  session_id     BIGINT       NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  email          TEXT         NOT NULL,
  address        TEXT         NOT NULL,
  city           TEXT         NOT NULL,
  country        TEXT         NOT NULL,
  total          INTEGER      NOT NULL,   -- rands, sum of order_items.price
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_session_id_idx ON orders (session_id);

CREATE TABLE IF NOT EXISTS order_items (
  id             BIGSERIAL    PRIMARY KEY,
  order_id       BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  work_id        BIGINT       REFERENCES works(id) ON DELETE SET NULL,
  title          TEXT         NOT NULL,   -- snapshot at order time
  price          INTEGER      NOT NULL    -- snapshot at order time, rands
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_work_id_idx  ON order_items (work_id);
