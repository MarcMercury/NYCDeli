-- Migration 044: Add detailed tent configuration fields
-- Adds: bringing_vehicle, tent_make_model, tent_entrance_count, tent_opening_side
-- These drive layout builder behavior — tent_opening_side + orientation_preference
-- determine which compass direction the tent door faces on the camp map.

-- ENUM: which physical side of the tent has the entrance
CREATE TYPE tent_opening_side_enum AS ENUM ('length', 'width', 'both');

-- Add new columns to campers table
ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS bringing_vehicle  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tent_make_model   TEXT,
  ADD COLUMN IF NOT EXISTS tent_entrance_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tent_opening_side tent_opening_side_enum;
