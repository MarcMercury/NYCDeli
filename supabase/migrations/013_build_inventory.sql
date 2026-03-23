-- Build Inventory - Checklist for verifying all camp materials,
-- structures, electricals, etc.

-- =====================================================
-- INVENTORY CATEGORY ENUM
-- =====================================================
CREATE TYPE inventory_category AS ENUM (
  'structures', 'electrical', 'kitchen', 'water', 'shade',
  'lighting', 'tools', 'safety', 'signage', 'decor',
  'personal', 'misc'
);

-- =====================================================
-- BUILD INVENTORY TABLE
-- =====================================================
CREATE TABLE build_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category inventory_category NOT NULL DEFAULT 'misc',
  name TEXT NOT NULL,
  description TEXT,
  quantity_expected INTEGER NOT NULL DEFAULT 1,
  quantity_actual INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_build_inventory_updated_at BEFORE UPDATE ON build_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE build_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON build_inventory FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON build_inventory FOR ALL USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_build_inventory_category ON build_inventory(category);
CREATE INDEX idx_build_inventory_verified ON build_inventory(verified);
