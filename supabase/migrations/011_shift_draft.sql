-- Shift Draft System
-- Live draft/selection of kitchen shifts run by Admin
-- Supports draft order, rounds, 2-minute pick timer, and real-time updates

-- =====================================================
-- ENUM: Draft status
-- =====================================================
DO $$ BEGIN
  CREATE TYPE draft_status AS ENUM ('setup', 'active', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE draft_pick_status AS ENUM ('pending', 'picking', 'picked', 'skipped', 'auto_skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SHIFT_DRAFTS - One row per draft session
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL DEFAULT 'Shift Draft',
  status draft_status NOT NULL DEFAULT 'setup',
  current_round INTEGER NOT NULL DEFAULT 0,
  current_pick_index INTEGER NOT NULL DEFAULT 0,
  pick_time_limit_seconds INTEGER NOT NULL DEFAULT 120,
  total_rounds INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SHIFT_DRAFT_ORDER - The ordered list of campers in the draft
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_draft_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  draft_position INTEGER NOT NULL,
  UNIQUE(draft_id, camper_id),
  UNIQUE(draft_id, draft_position)
);

-- =====================================================
-- SHIFT_DRAFT_PICKS - Each pick made (or skipped) during the draft
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_draft_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  pick_index INTEGER NOT NULL,
  shift_category TEXT,
  shift_role TEXT,
  shift_time TEXT,
  status draft_pick_status NOT NULL DEFAULT 'pending',
  picked_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  turn_started_at TIMESTAMPTZ,
  UNIQUE(draft_id, round_number, pick_index)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_shift_draft_order_draft ON shift_draft_order(draft_id);
CREATE INDEX IF NOT EXISTS idx_shift_draft_order_camper ON shift_draft_order(camper_id);
CREATE INDEX IF NOT EXISTS idx_shift_draft_picks_draft ON shift_draft_picks(draft_id);
CREATE INDEX IF NOT EXISTS idx_shift_draft_picks_camper ON shift_draft_picks(camper_id);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE shift_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_draft_picks ENABLE ROW LEVEL SECURITY;

-- Everyone can read drafts
CREATE POLICY "shift_drafts_select" ON shift_drafts
  FOR SELECT USING (true);

CREATE POLICY "shift_draft_order_select" ON shift_draft_order
  FOR SELECT USING (true);

CREATE POLICY "shift_draft_picks_select" ON shift_draft_picks
  FOR SELECT USING (true);

-- Only admins can manage drafts
CREATE POLICY "shift_drafts_admin_insert" ON shift_drafts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shift_drafts_admin_update" ON shift_drafts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shift_drafts_admin_delete" ON shift_drafts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can manage draft order
CREATE POLICY "shift_draft_order_admin_insert" ON shift_draft_order
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shift_draft_order_admin_update" ON shift_draft_order
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shift_draft_order_admin_delete" ON shift_draft_order
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Picks: admins can do everything, campers can insert their own pick when it's their turn
CREATE POLICY "shift_draft_picks_admin_all" ON shift_draft_picks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shift_draft_picks_camper_update" ON shift_draft_picks
  FOR UPDATE USING (
    camper_id IN (
      SELECT c.id FROM campers c
      JOIN user_profiles up ON up.camper_id = c.id
      WHERE up.id = auth.uid()
    )
    AND status = 'picking'
  );

-- =====================================================
-- Enable Realtime for draft tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE shift_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_draft_picks;
