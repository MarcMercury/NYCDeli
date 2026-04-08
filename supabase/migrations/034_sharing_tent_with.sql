-- Add sharing_tent_with column to campers table
-- References another camper by their ID (nullable, self-referencing FK)

ALTER TABLE campers ADD COLUMN sharing_tent_with UUID REFERENCES campers(id) ON DELETE SET NULL;
