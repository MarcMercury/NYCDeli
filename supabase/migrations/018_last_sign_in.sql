-- NYCDeliRats2026 Last Sign-In Tracking
-- Migration 018: Add last_sign_in_at column to user_profiles

ALTER TABLE user_profiles
  ADD COLUMN last_sign_in_at TIMESTAMPTZ;
