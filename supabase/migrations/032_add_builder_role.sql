-- Add 'builder' role to user_role enum
-- Builder can see everything a user can PLUS Build Week
-- Admin can see everything including Admin panel
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'builder' AFTER 'user';
