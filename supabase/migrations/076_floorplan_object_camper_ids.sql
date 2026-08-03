-- Link placed floorplan objects (tents) to the campers they house.
-- Generate Tents uses this to skip campers already placed on the saved layout.

ALTER TABLE floorplan_objects
  ADD COLUMN IF NOT EXISTS camper_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN floorplan_objects.camper_ids IS
  'Camper UUIDs this object (tent) houses. Set when a generated tent is placed; read by Generate Tents to skip already-placed campers.';

-- One-time best-effort backfill so the CURRENT saved layout is recognized:
-- match each existing tent''s label (e.g. "Alice & Bob" or "Charlie (RV)")
-- against campers.full_name. After this, the camper_ids link is authoritative
-- and no further name matching happens at runtime.
DO $$
DECLARE
  obj RECORD;
  part TEXT;
  cid UUID;
  ids UUID[];
BEGIN
  FOR obj IN
    SELECT id, label
    FROM floorplan_objects
    WHERE object_type = 'tent'
      AND (camper_ids IS NULL OR camper_ids = '{}')
      AND coalesce(trim(label), '') <> ''
  LOOP
    ids := ARRAY[]::UUID[];
    FOREACH part IN ARRAY string_to_array(
      regexp_replace(obj.label, '\s*\(RV\)\s*$', ''), ' & '
    )
    LOOP
      SELECT c.id INTO cid
      FROM campers c
      WHERE lower(trim(c.full_name)) = lower(trim(part))
      LIMIT 1;
      IF cid IS NOT NULL THEN
        ids := array_append(ids, cid);
      END IF;
    END LOOP;

    IF array_length(ids, 1) > 0 THEN
      UPDATE floorplan_objects SET camper_ids = ids WHERE id = obj.id;
    END IF;
  END LOOP;
END $$;
