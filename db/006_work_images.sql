-- ============================================================
--  006 — photographs of the works.
--
--  works.image is the object's path in the `artworks` bucket
--  (<env>/<work id>/<uuid>.jpg), or NULL for the placeholder frame.
--  The bucket is public-read — the photographs are what the site
--  publishes — but nothing may write to it except the `work-image`
--  edge function (service role): storage.objects gets no policies.
--  Every stored image has already been scaled down and re-encoded as
--  JPEG by that function, hence the 2 MB cap and the one MIME type.
-- ============================================================

ALTER TABLE works ADD COLUMN IF NOT EXISTS image TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('artworks', 'artworks', TRUE, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
