-- Add count (numeric quantity) to build_resources
ALTER TABLE build_resources ADD COLUMN count INTEGER NOT NULL DEFAULT 0;

-- Add confirmed_working to both build_resources and build_inventory
ALTER TABLE build_resources ADD COLUMN confirmed_working BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE build_inventory ADD COLUMN confirmed_working BOOLEAN NOT NULL DEFAULT false;
