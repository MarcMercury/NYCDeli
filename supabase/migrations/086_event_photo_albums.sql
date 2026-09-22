-- 086: Manually linked photo albums per event.
--
-- Camp photos live in external drives (Google Photos, Drive, Dropbox…), not in
-- our storage bucket. Admins paste the share link once and it stays attached to
-- the event forever — deliberately readable after the event is closed, because
-- an archived event is exactly when people go looking for the pictures.
--
-- Share links are capability URLs: anyone holding one can view the album. The
-- default is therefore members-only; `is_public` must be set explicitly for a
-- link to be exposed to anonymous visitors.

CREATE TABLE IF NOT EXISTS event_photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  url TEXT NOT NULL,
  -- google_photos | google_drive | dropbox | icloud | smugmug | flickr | other
  provider TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  -- False (default) = signed-in approved members only.
  is_public BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT event_photo_albums_url_http CHECK (url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_event_photo_albums_event ON event_photo_albums (event_id, sort_order);

DROP TRIGGER IF EXISTS event_photo_albums_updated_at ON event_photo_albums;
CREATE TRIGGER event_photo_albums_updated_at BEFORE UPDATE ON event_photo_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE event_photo_albums ENABLE ROW LEVEL SECURITY;

-- Read gating is enforced here rather than in the UI: a hidden-but-fetched
-- share link would still be a leaked album.
DROP POLICY IF EXISTS event_photo_albums_select ON event_photo_albums;
CREATE POLICY event_photo_albums_select ON event_photo_albums
  FOR SELECT USING (is_public OR is_approved() OR is_site_admin());

DROP POLICY IF EXISTS event_photo_albums_insert ON event_photo_albums;
CREATE POLICY event_photo_albums_insert ON event_photo_albums
  FOR INSERT WITH CHECK (is_site_admin());

DROP POLICY IF EXISTS event_photo_albums_update ON event_photo_albums;
CREATE POLICY event_photo_albums_update ON event_photo_albums
  FOR UPDATE USING (is_site_admin()) WITH CHECK (is_site_admin());

DROP POLICY IF EXISTS event_photo_albums_delete ON event_photo_albums;
CREATE POLICY event_photo_albums_delete ON event_photo_albums
  FOR DELETE USING (is_site_admin());

-- Seed the Burning Man 2026 album (the event is already closed/archived).
INSERT INTO event_photo_albums (event_id, label, url, provider, description, is_public, sort_order)
SELECT
  e.id,
  'Burning Man 2026 — Camp Album',
  'https://photos.google.com/share/AF1QipO4f-CQHoK0GqmGJ-K_YQkdu3XUYPTDRI2HgBx0DtQpfEItRgqZuklCAdRcxC25UQ?key=d0RXVGd6Z05MdmNIX2E0bmFtWFE0UWVobTRlRUtn',
  'google_photos',
  'Shared camp photos from the 2026 burn.',
  false,
  0
FROM events e
WHERE e.slug = 'burning-man-2026'
  AND NOT EXISTS (
    SELECT 1 FROM event_photo_albums a WHERE a.event_id = e.id AND a.url LIKE 'https://photos.google.com/share/AF1QipO4f-CQHoK0GqmGJ%'
  );
