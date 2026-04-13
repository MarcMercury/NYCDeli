-- Add 'pre_build' to the build_schedule_day enum for PRE-Build Week items
ALTER TYPE build_schedule_day ADD VALUE IF NOT EXISTS 'pre_build' BEFORE 'saturday';
