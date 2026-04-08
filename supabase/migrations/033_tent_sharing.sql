-- Tent Sharing: Allow multiple campers to share a single tent/camp spot
-- This ONLY applies to tent reservations/accommodations, NOT shifts or other functions.

-- 1. Add max_occupants to camp_spots (how many campers can share a spot)
ALTER TABLE camp_spots ADD COLUMN max_occupants INTEGER NOT NULL DEFAULT 2;

-- 2. Drop the unique constraint that limits one reservation per spot.
--    This allows multiple campers to reserve the same spot (tent sharing).
ALTER TABLE camp_reservations DROP CONSTRAINT one_active_per_spot;

-- 3. Instead, add a partial unique constraint: (spot_id, camper_id) so the same
--    camper can't double-reserve the same spot.
CREATE UNIQUE INDEX idx_unique_camper_per_spot
  ON camp_reservations (spot_id, camper_id)
  WHERE status = 'reserved';

-- 4. Add a primary_camper flag — the first person to reserve is the "primary" occupant.
--    The primary camper "owns" the spot and can release it, removing all co-occupants.
ALTER TABLE camp_reservations ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
