-- ============================================================
--  005 — the catalogue seed: the gallery's current roster, generated
--  from ui/demo.js. Staging (env 0) gets it with the demo's ids, so dev
--  and staging agree; production (env 1) gets a copy with fresh ids.
--  Run once on a fresh database; it is not idempotent by design.
-- ============================================================

INSERT INTO artists (id, env, name, medium, based, instagram, short, bio) VALUES
  (1, 0, 'Thandi Mokoena', 'Oil on linen', 'Johannesburg', '@thandimokoena', 'Interiors emptied of their people, painted from the light that stays behind.', 'Mokoena paints rooms after the fact — a chair pushed out, curtains still moving. Her surfaces are built in thin, slow layers so the wall behind the canvas seems to carry on through it.'),
  (2, 0, 'Pieter van Wyk', 'Charcoal on paper', 'Stellenbosch', '@pvw.studio', 'Portraits worked until the paper bruises, then lifted back out with an eraser.', 'Van Wyk draws one sitter over many weeks. The finished sheets hold every previous attempt beneath them, which is why his faces read as though they are still deciding something.'),
  (3, 0, 'Lerato Nkosi', 'Ceramic and glaze', 'Durban', '@leratomakes', 'Vessels thrown thin enough to lean, glazed in salt and ash.', 'Nkosi throws forms that sit just past their balance point. The glazes are mixed from river silt and wood ash, so no two firings agree with each other.'),
  (4, 0, 'Ruan Basson', 'Cyanotype on cotton', 'Cape Town', '@ruan.cyan', 'Sunlight printed directly onto cloth on the roof of the gallery.', 'Basson exposes coated cotton on the gallery roof, sometimes for a full day. Wind, shade and passing gulls all leave their record in the blue.'),
  (5, 0, 'Zanele Mahlangu', 'Textile assemblage', 'Pretoria', '@zanele.assembles', 'Inherited cloth cut down and rebuilt into low, quiet reliefs.', 'Mahlangu works with cloth from her family and from markets she can name. Cut, stacked and stitched flat, the pieces sit a few centimetres off the wall and cast their own shadow.'),
  (6, 0, 'Kim Oosthuizen', 'Pigment on board', 'Knysna', '@kimoosthuizen', 'Flat fields of hand-ground pigment that change as you walk past them.', 'Oosthuizen grinds her own pigment and lays it down in single passes on gessoed board. Read straight on, the panels are almost nothing; at an angle they turn.');

INSERT INTO works (id, env, artist_id, title, year, medium, size, price, available) VALUES
  (1, 0, 1, 'Afternoon, Held', '2025', 'Oil on linen', '140 × 110 cm', 186000, TRUE),
  (2, 0, 1, 'Doorway (Yeoville)', '2024', 'Oil on linen', '90 × 70 cm', 124000, TRUE),
  (3, 0, 1, 'Two Chairs', '2024', 'Oil on board', '60 × 45 cm', 68000, FALSE),
  (4, 0, 1, 'Late Sun', '2023', 'Oil on linen', '110 × 110 cm', 142000, TRUE),
  (5, 0, 2, 'Sitter VII', '2025', 'Charcoal on paper', '150 × 100 cm', 92000, TRUE),
  (6, 0, 2, 'Sitter III', '2024', 'Charcoal and chalk', '100 × 70 cm', 64000, TRUE),
  (7, 0, 2, 'Study, Hands', '2024', 'Charcoal on paper', '40 × 30 cm', 28000, TRUE),
  (8, 0, 2, 'Nightwatch', '2023', 'Charcoal on paper', '120 × 90 cm', 78000, FALSE),
  (9, 0, 3, 'Leaning Vessel No. 9', '2025', 'Stoneware, ash glaze', '52 cm high', 46000, TRUE),
  (10, 0, 3, 'Salt Pair', '2025', 'Porcelain, salt glaze', '28 cm high', 32000, TRUE),
  (11, 0, 3, 'River Bowl', '2024', 'Stoneware', '44 cm diameter', 38000, FALSE),
  (12, 0, 3, 'Ash Column', '2024', 'Stoneware, ash glaze', '68 cm high', 58000, TRUE),
  (13, 0, 4, 'Roof Exposure, 11 Hours', '2025', 'Cyanotype on cotton', '200 × 150 cm', 74000, TRUE),
  (14, 0, 4, 'Gull', '2025', 'Cyanotype on cotton', '80 × 60 cm', 34000, TRUE),
  (15, 0, 4, 'Wind Study', '2024', 'Cyanotype on paper', '70 × 50 cm', 26000, TRUE),
  (16, 0, 4, 'Blue Field', '2023', 'Cyanotype on cotton', '160 × 120 cm', 62000, FALSE),
  (17, 0, 5, 'Household I', '2025', 'Cotton, wool, thread', '180 × 140 cm', 158000, TRUE),
  (18, 0, 5, 'Household II', '2025', 'Cotton, linen, thread', '180 × 140 cm', 158000, TRUE),
  (19, 0, 5, 'Small Inheritance', '2024', 'Cloth on board', '50 × 40 cm', 42000, TRUE),
  (20, 0, 5, 'Fold', '2023', 'Wool, thread', '120 × 90 cm', 96000, FALSE),
  (21, 0, 6, 'Panel (Ochre)', '2025', 'Pigment on board', '120 × 120 cm', 112000, TRUE),
  (22, 0, 6, 'Panel (Slate)', '2025', 'Pigment on board', '120 × 120 cm', 112000, TRUE),
  (23, 0, 6, 'Turn', '2024', 'Pigment on board', '70 × 70 cm', 58000, FALSE),
  (24, 0, 6, 'Quiet Ground', '2024', 'Pigment on board', '90 × 90 cm', 74000, TRUE);

-- move the sequences past the seeded ids
SELECT setval('artists_id_seq', (SELECT max(id) FROM artists));
SELECT setval('works_id_seq',   (SELECT max(id) FROM works));

-- production starts as a copy of staging's catalogue
WITH copied AS (
  INSERT INTO artists (env, name, medium, based, instagram, short, bio)
  SELECT 1, name, medium, based, instagram, short, bio FROM artists WHERE env = 0 ORDER BY id
  RETURNING id, name
)
INSERT INTO works (env, artist_id, title, year, medium, size, price, available)
SELECT 1, c.id, w.title, w.year, w.medium, w.size, w.price, w.available
FROM works w JOIN artists a ON a.id = w.artist_id AND a.env = 0
JOIN copied c ON c.name = a.name
ORDER BY w.id;
