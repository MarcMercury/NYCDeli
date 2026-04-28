-- =====================================================
-- Migration 053: Auto-Draft (ranked-preference) System
-- =====================================================
-- Replaces the live shift draft with an offline auto-draft
-- driven by camper rankings.
--
-- Pools: deli, special, strike (run independently with own quotas).
-- Round order: rounds 1..(snake_start_round-1) = forward;
--   from snake_start_round, alternating starting with reverse.
--   Default snake_start_round=3 → R1 fwd, R2 fwd, R3 rev, R4 fwd.
-- Quota default: deli=4, special=0, strike=1. counts_double = 2 credits.
-- Day filter: shift offering's day_date must lie within
--   camper.arrival_date..camper.departure_date (hard).
-- EXP requirement: NOT enforced server-side.
-- =====================================================

-- =====================================================
-- 1. Camper: add departure_method
-- =====================================================
ALTER TABLE campers
  ADD COLUMN IF NOT EXISTS departure_method arrival_method NOT NULL DEFAULT 'car';

-- =====================================================
-- 2. Drop the old live-draft tables
-- =====================================================
DROP TABLE IF EXISTS shift_draft_picks CASCADE;
DROP TABLE IF EXISTS shift_draft_order CASCADE;

-- =====================================================
-- 3. Reshape shift_drafts table
-- =====================================================
ALTER TABLE shift_drafts
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE shift_drafts
  ALTER COLUMN status SET DEFAULT 'open'::draft_status;

ALTER TABLE shift_drafts
  DROP COLUMN IF EXISTS current_round,
  DROP COLUMN IF EXISTS current_pick_index,
  DROP COLUMN IF EXISTS pick_time_limit_seconds,
  DROP COLUMN IF EXISTS total_rounds,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS completed_at;

ALTER TABLE shift_drafts
  ADD COLUMN IF NOT EXISTS ranking_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drafted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS random_seed BIGINT,
  ADD COLUMN IF NOT EXISTS deli_quota INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS special_quota INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strike_quota INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS snake_start_round INTEGER NOT NULL DEFAULT 3;

-- updated_at trigger
CREATE OR REPLACE FUNCTION trg_shift_drafts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS shift_drafts_updated_at ON shift_drafts;
CREATE TRIGGER shift_drafts_updated_at
  BEFORE UPDATE ON shift_drafts
  FOR EACH ROW EXECUTE FUNCTION trg_shift_drafts_updated_at();

-- =====================================================
-- 4. shift_offerings — admin-editable list of rankable shifts
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_offerings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  pool draft_pool NOT NULL,
  category TEXT NOT NULL,
  role TEXT NOT NULL,
  time_label TEXT,
  day_label TEXT,
  day_date DATE,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  requires_exp BOOLEAN NOT NULL DEFAULT FALSE,
  counts_double BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_offerings_draft ON shift_offerings(draft_id);
CREATE INDEX IF NOT EXISTS idx_offerings_pool ON shift_offerings(draft_id, pool);
CREATE UNIQUE INDEX IF NOT EXISTS uq_offerings_natural
  ON shift_offerings (draft_id, pool, category, role, COALESCE(time_label, ''), COALESCE(day_label, ''));

DROP TRIGGER IF EXISTS shift_offerings_updated_at ON shift_offerings;
CREATE TRIGGER shift_offerings_updated_at
  BEFORE UPDATE ON shift_offerings
  FOR EACH ROW EXECUTE FUNCTION trg_shift_drafts_updated_at();

-- =====================================================
-- 5. shift_draft_order — admin-defined camper priority
-- =====================================================
CREATE TABLE shift_draft_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  draft_position INTEGER NOT NULL CHECK (draft_position > 0),
  UNIQUE (draft_id, camper_id),
  UNIQUE (draft_id, draft_position)
);

CREATE INDEX IF NOT EXISTS idx_shift_draft_order_draft ON shift_draft_order(draft_id);
CREATE INDEX IF NOT EXISTS idx_shift_draft_order_camper ON shift_draft_order(camper_id);

-- =====================================================
-- 6. shift_draft_rankings
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_draft_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES shift_offerings(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  CONSTRAINT uq_rankings_offering UNIQUE (draft_id, camper_id, offering_id),
  CONSTRAINT uq_rankings_rank UNIQUE (draft_id, camper_id, rank) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_rankings_draft_camper ON shift_draft_rankings(draft_id, camper_id);
CREATE INDEX IF NOT EXISTS idx_rankings_offering ON shift_draft_rankings(offering_id);

DROP TRIGGER IF EXISTS shift_draft_rankings_updated_at ON shift_draft_rankings;
CREATE TRIGGER shift_draft_rankings_updated_at
  BEFORE UPDATE ON shift_draft_rankings
  FOR EACH ROW EXECUTE FUNCTION trg_shift_drafts_updated_at();

-- =====================================================
-- 7. shift_draft_assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_draft_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  draft_id UUID NOT NULL REFERENCES shift_drafts(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES shift_offerings(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index > 0),
  source draft_assignment_source NOT NULL,
  assigned_round INTEGER,
  rank_used INTEGER,
  UNIQUE (draft_id, offering_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_assignments_draft ON shift_draft_assignments(draft_id);
CREATE INDEX IF NOT EXISTS idx_assignments_camper ON shift_draft_assignments(draft_id, camper_id);

-- =====================================================
-- 8. RLS
-- =====================================================
ALTER TABLE shift_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_draft_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_draft_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_offerings_select ON shift_offerings;
CREATE POLICY shift_offerings_select ON shift_offerings
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS shift_offerings_admin_write ON shift_offerings;
CREATE POLICY shift_offerings_admin_write ON shift_offerings
  FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS shift_draft_order_select ON shift_draft_order;
CREATE POLICY shift_draft_order_select ON shift_draft_order
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS shift_draft_order_admin_write ON shift_draft_order;
CREATE POLICY shift_draft_order_admin_write ON shift_draft_order
  FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rankings: campers see only their own (until publish, when admin opens via a view if desired)
DROP POLICY IF EXISTS rankings_select ON shift_draft_rankings;
CREATE POLICY rankings_select ON shift_draft_rankings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    OR camper_id IN (SELECT camper_id FROM user_profiles WHERE id = auth.uid())
  );
DROP POLICY IF EXISTS rankings_admin_write ON shift_draft_rankings;
CREATE POLICY rankings_admin_write ON shift_draft_rankings
  FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
-- (Camper writes go through SECURITY DEFINER RPCs.)

DROP POLICY IF EXISTS assignments_select ON shift_draft_assignments;
CREATE POLICY assignments_select ON shift_draft_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS assignments_admin_write ON shift_draft_assignments;
CREATE POLICY assignments_admin_write ON shift_draft_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 9. Realtime publication
-- =====================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shift_offerings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shift_draft_order; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shift_draft_rankings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shift_draft_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 10. Helpers
-- =====================================================
CREATE OR REPLACE FUNCTION _is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION _camper_id_for_auth()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT camper_id FROM user_profiles WHERE id = auth.uid();
$$;

-- =====================================================
-- 11. Camper-facing RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION upsert_camper_ranking(
  p_draft_id UUID, p_offering_id UUID, p_rank INTEGER, p_camper_id UUID DEFAULT NULL
) RETURNS shift_draft_rankings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_camper UUID;
  v_status draft_status;
  v_existing_at_rank UUID;
  v_existing_for_offering UUID;
  v_old_rank INTEGER;
  v_result shift_draft_rankings;
BEGIN
  IF _is_admin() AND p_camper_id IS NOT NULL THEN v_camper := p_camper_id;
  ELSE
    v_camper := _camper_id_for_auth();
    IF v_camper IS NULL THEN RAISE EXCEPTION 'Not linked to a camper'; END IF;
  END IF;

  IF p_rank IS NULL OR p_rank < 1 THEN
    RAISE EXCEPTION 'Rank must be a positive integer';
  END IF;

  SELECT status INTO v_status FROM shift_drafts WHERE id = p_draft_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Draft not found'; END IF;
  IF NOT _is_admin() AND v_status <> 'open' THEN
    RAISE EXCEPTION 'Rankings are frozen';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM shift_offerings WHERE id = p_offering_id AND draft_id = p_draft_id) THEN
    RAISE EXCEPTION 'Offering not in this draft';
  END IF;

  SELECT id, rank INTO v_existing_for_offering, v_old_rank
  FROM shift_draft_rankings
  WHERE draft_id = p_draft_id AND camper_id = v_camper AND offering_id = p_offering_id;

  SELECT id INTO v_existing_at_rank
  FROM shift_draft_rankings
  WHERE draft_id = p_draft_id AND camper_id = v_camper AND rank = p_rank
    AND (v_existing_for_offering IS NULL OR id <> v_existing_for_offering);

  -- Use deferred unique constraint: we can do swaps in a single transaction.
  IF v_existing_for_offering IS NOT NULL AND v_existing_at_rank IS NOT NULL THEN
    UPDATE shift_draft_rankings SET rank = v_old_rank WHERE id = v_existing_at_rank;
    UPDATE shift_draft_rankings SET rank = p_rank    WHERE id = v_existing_for_offering
      RETURNING * INTO v_result;
  ELSIF v_existing_for_offering IS NOT NULL THEN
    UPDATE shift_draft_rankings SET rank = p_rank WHERE id = v_existing_for_offering
      RETURNING * INTO v_result;
  ELSIF v_existing_at_rank IS NOT NULL THEN
    DELETE FROM shift_draft_rankings WHERE id = v_existing_at_rank;
    INSERT INTO shift_draft_rankings (draft_id, camper_id, offering_id, rank)
      VALUES (p_draft_id, v_camper, p_offering_id, p_rank)
      RETURNING * INTO v_result;
  ELSE
    INSERT INTO shift_draft_rankings (draft_id, camper_id, offering_id, rank)
      VALUES (p_draft_id, v_camper, p_offering_id, p_rank)
      RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION clear_camper_ranking(
  p_draft_id UUID, p_offering_id UUID, p_camper_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_camper UUID; v_status draft_status;
BEGIN
  IF _is_admin() AND p_camper_id IS NOT NULL THEN v_camper := p_camper_id;
  ELSE
    v_camper := _camper_id_for_auth();
    IF v_camper IS NULL THEN RAISE EXCEPTION 'Not linked to a camper'; END IF;
  END IF;
  SELECT status INTO v_status FROM shift_drafts WHERE id = p_draft_id;
  IF NOT _is_admin() AND v_status <> 'open' THEN RAISE EXCEPTION 'Rankings are frozen'; END IF;
  DELETE FROM shift_draft_rankings
   WHERE draft_id = p_draft_id AND camper_id = v_camper AND offering_id = p_offering_id;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION compact_camper_rankings(
  p_draft_id UUID, p_camper_id UUID DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_camper UUID; v_status draft_status; v_count INTEGER;
BEGIN
  IF _is_admin() AND p_camper_id IS NOT NULL THEN v_camper := p_camper_id;
  ELSE
    v_camper := _camper_id_for_auth();
    IF v_camper IS NULL THEN RAISE EXCEPTION 'Not linked to a camper'; END IF;
  END IF;
  SELECT status INTO v_status FROM shift_drafts WHERE id = p_draft_id;
  IF NOT _is_admin() AND v_status <> 'open' THEN RAISE EXCEPTION 'Rankings are frozen'; END IF;

  WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY rank) AS new_rank
    FROM shift_draft_rankings
    WHERE draft_id = p_draft_id AND camper_id = v_camper
  )
  UPDATE shift_draft_rankings r SET rank = ordered.new_rank::INTEGER
    FROM ordered WHERE r.id = ordered.id;

  SELECT COUNT(*) INTO v_count FROM shift_draft_rankings
   WHERE draft_id = p_draft_id AND camper_id = v_camper;
  RETURN v_count;
END $$;

-- =====================================================
-- 12. Admin RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION freeze_draft_rankings(p_draft_id UUID)
RETURNS shift_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row shift_drafts;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE shift_drafts SET status = 'frozen', ranking_frozen_at = NOW()
   WHERE id = p_draft_id RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION unfreeze_draft_rankings(p_draft_id UUID)
RETURNS shift_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row shift_drafts;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE shift_drafts SET status = 'open', ranking_frozen_at = NULL
   WHERE id = p_draft_id RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION publish_draft(p_draft_id UUID)
RETURNS shift_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row shift_drafts;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE shift_drafts SET status = 'archived'
   WHERE id = p_draft_id RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION swap_assignments(p_assignment_a UUID, p_assignment_b UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a UUID; v_b UUID;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT camper_id INTO v_a FROM shift_draft_assignments WHERE id = p_assignment_a;
  SELECT camper_id INTO v_b FROM shift_draft_assignments WHERE id = p_assignment_b;
  IF v_a IS NULL OR v_b IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  UPDATE shift_draft_assignments SET camper_id = v_b, source = 'manual' WHERE id = p_assignment_a;
  UPDATE shift_draft_assignments SET camper_id = v_a, source = 'manual' WHERE id = p_assignment_b;
  RETURN TRUE;
END $$;

-- =====================================================
-- 13. THE AUTO-DRAFT ALGORITHM
-- =====================================================
CREATE OR REPLACE FUNCTION run_auto_draft(
  p_draft_id UUID, p_seed BIGINT DEFAULT NULL, p_dry_run BOOLEAN DEFAULT FALSE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_draft       shift_drafts;
  v_seed        BIGINT;
  v_pool        draft_pool;
  v_quota       INTEGER;
  v_max_rounds  INTEGER := 12;
  v_round       INTEGER;
  v_direction   INTEGER;
  v_camper      RECORD;
  v_offering    RECORD;
  v_progress    BOOLEAN;
  v_remaining   INTEGER;
  v_slot_idx    INTEGER;
  v_planned     JSONB;
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_draft FROM shift_drafts WHERE id = p_draft_id FOR UPDATE;
  IF v_draft IS NULL THEN RAISE EXCEPTION 'Draft not found'; END IF;
  IF v_draft.status NOT IN ('frozen','drafted') THEN
    RAISE EXCEPTION 'Draft must be frozen before running auto-draft (status=%)', v_draft.status;
  END IF;

  v_seed := COALESCE(p_seed, v_draft.random_seed, EXTRACT(EPOCH FROM NOW())::BIGINT);
  PERFORM setseed(((v_seed % 1000000)::DOUBLE PRECISION) / 1000000.0);

  CREATE TEMP TABLE tmp_quota ON COMMIT DROP AS
    SELECT o.camper_id, o.draft_position,
           c.arrival_date, c.departure_date,
           v_draft.deli_quota    AS deli_remaining,
           v_draft.special_quota AS special_remaining,
           v_draft.strike_quota  AS strike_remaining
      FROM shift_draft_order o
      JOIN campers c ON c.id = o.camper_id
     WHERE o.draft_id = p_draft_id;

  CREATE TEMP TABLE tmp_used ON COMMIT DROP AS
    SELECT o.id AS offering_id, o.pool, o.capacity, 0::INTEGER AS used
      FROM shift_offerings o
     WHERE o.draft_id = p_draft_id;

  CREATE TEMP TABLE tmp_assignments (
    camper_id UUID, offering_id UUID, slot_index INTEGER,
    source draft_assignment_source, assigned_round INTEGER, rank_used INTEGER
  ) ON COMMIT DROP;

  FOR v_pool IN SELECT unnest(ARRAY['deli','special','strike']::draft_pool[]) LOOP
    v_quota := CASE v_pool
      WHEN 'deli'    THEN v_draft.deli_quota
      WHEN 'special' THEN v_draft.special_quota
      WHEN 'strike'  THEN v_draft.strike_quota
    END;
    IF v_quota <= 0 THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM shift_offerings WHERE draft_id = p_draft_id AND pool = v_pool) THEN
      CONTINUE;
    END IF;

    v_round := 0;
    LOOP
      v_round := v_round + 1;
      EXIT WHEN v_round > v_max_rounds;

      IF v_round < v_draft.snake_start_round THEN
        v_direction := 1;
      ELSE
        IF ((v_round - v_draft.snake_start_round) % 2) = 0 THEN
          v_direction := -1;
        ELSE
          v_direction := 1;
        END IF;
      END IF;

      v_progress := FALSE;

      FOR v_camper IN
        SELECT q.* FROM tmp_quota q
        ORDER BY CASE WHEN v_direction = 1 THEN q.draft_position ELSE -q.draft_position END
      LOOP
        v_remaining := CASE v_pool
          WHEN 'deli'    THEN v_camper.deli_remaining
          WHEN 'special' THEN v_camper.special_remaining
          WHEN 'strike'  THEN v_camper.strike_remaining
        END;
        IF v_remaining <= 0 THEN CONTINUE; END IF;

        -- Highest-ranked still-available offering in date window
        SELECT o.id, o.capacity, o.counts_double, o.day_date, r.rank AS rank_val
          INTO v_offering
          FROM shift_draft_rankings r
          JOIN shift_offerings o ON o.id = r.offering_id
          JOIN tmp_used u ON u.offering_id = o.id
         WHERE r.draft_id = p_draft_id
           AND r.camper_id = v_camper.camper_id
           AND o.pool = v_pool
           AND u.used < u.capacity
           AND (o.day_date IS NULL
                OR o.day_date BETWEEN v_camper.arrival_date AND v_camper.departure_date)
           AND NOT EXISTS (
             SELECT 1 FROM tmp_assignments a
              WHERE a.camper_id = v_camper.camper_id AND a.offering_id = o.id
           )
         ORDER BY r.rank ASC
         LIMIT 1;

        IF v_offering.id IS NULL THEN
          -- Fallback: random_fill from any offering with capacity in date window
          SELECT o.id, o.capacity, o.counts_double, o.day_date, NULL::INTEGER AS rank_val
            INTO v_offering
            FROM shift_offerings o
            JOIN tmp_used u ON u.offering_id = o.id
           WHERE o.draft_id = p_draft_id
             AND o.pool = v_pool
             AND u.used < u.capacity
             AND (o.day_date IS NULL
                  OR o.day_date BETWEEN v_camper.arrival_date AND v_camper.departure_date)
             AND NOT EXISTS (
               SELECT 1 FROM tmp_assignments a
                WHERE a.camper_id = v_camper.camper_id AND a.offering_id = o.id
             )
           ORDER BY random()
           LIMIT 1;
        END IF;

        IF v_offering.id IS NULL THEN CONTINUE; END IF;

        SELECT COALESCE(MAX(slot_index), 0) + 1 INTO v_slot_idx
          FROM tmp_assignments WHERE offering_id = v_offering.id;

        INSERT INTO tmp_assignments(camper_id, offering_id, slot_index, source, assigned_round, rank_used)
          VALUES (v_camper.camper_id, v_offering.id, v_slot_idx,
                  CASE WHEN v_offering.rank_val IS NOT NULL THEN 'ranked'::draft_assignment_source
                       ELSE 'random_fill'::draft_assignment_source END,
                  v_round, v_offering.rank_val);

        UPDATE tmp_used SET used = used + 1 WHERE offering_id = v_offering.id;

        IF v_pool = 'deli' THEN
          UPDATE tmp_quota SET deli_remaining = deli_remaining
            - (CASE WHEN v_offering.counts_double THEN 2 ELSE 1 END)
           WHERE camper_id = v_camper.camper_id;
        ELSIF v_pool = 'special' THEN
          UPDATE tmp_quota SET special_remaining = special_remaining
            - (CASE WHEN v_offering.counts_double THEN 2 ELSE 1 END)
           WHERE camper_id = v_camper.camper_id;
        ELSE
          UPDATE tmp_quota SET strike_remaining = strike_remaining
            - (CASE WHEN v_offering.counts_double THEN 2 ELSE 1 END)
           WHERE camper_id = v_camper.camper_id;
        END IF;

        v_progress := TRUE;
      END LOOP; -- campers

      EXIT WHEN NOT v_progress;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM tmp_quota WHERE
          (v_pool='deli'    AND deli_remaining    > 0) OR
          (v_pool='special' AND special_remaining > 0) OR
          (v_pool='strike'  AND strike_remaining  > 0)
      );
    END LOOP; -- rounds
  END LOOP; -- pools

  SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb) INTO v_planned
    FROM (
      SELECT a.*, o.category, o.role, o.time_label, o.day_label, o.day_date, o.pool,
             c.full_name AS camper_name, c.playa_name AS camper_playa_name
        FROM tmp_assignments a
        JOIN shift_offerings o ON o.id = a.offering_id
        JOIN campers c ON c.id = a.camper_id
       ORDER BY a.assigned_round, o.pool, o.day_date NULLS LAST, o.category, o.role
    ) t;

  IF NOT p_dry_run THEN
    DELETE FROM shift_draft_assignments WHERE draft_id = p_draft_id;
    INSERT INTO shift_draft_assignments
      (draft_id, camper_id, offering_id, slot_index, source, assigned_round, rank_used)
    SELECT p_draft_id, camper_id, offering_id, slot_index, source, assigned_round, rank_used
      FROM tmp_assignments;
    UPDATE shift_drafts
       SET status = 'drafted', drafted_at = NOW(), random_seed = v_seed
     WHERE id = p_draft_id;
  END IF;

  RETURN jsonb_build_object(
    'draft_id', p_draft_id,
    'seed', v_seed,
    'dry_run', p_dry_run,
    'count', (SELECT COUNT(*) FROM tmp_assignments),
    'assignments', v_planned
  );
END $$;

-- =====================================================
-- 14. Seed function — populate offerings from canonical catalog
-- =====================================================
CREATE OR REPLACE FUNCTION seed_default_shift_offerings(p_draft_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before INTEGER;
  v_after  INTEGER;
  v_days   TEXT[]  := ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'];
  v_dates  DATE[]  := ARRAY[
    DATE '2026-08-31', DATE '2026-09-01', DATE '2026-09-02',
    DATE '2026-09-03', DATE '2026-09-04', DATE '2026-09-05'
  ];
  v_strike DATE := DATE '2026-09-06';
  v_dpfri  DATE := DATE '2026-09-04';
BEGIN
  IF NOT _is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM shift_drafts WHERE id = p_draft_id) THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;

  SELECT COUNT(*) INTO v_before FROM shift_offerings WHERE draft_id = p_draft_id;

  -- Daily deli offerings: cross join template × Mon..Sat
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    capacity, requires_exp, counts_double, description, sort_order)
  SELECT p_draft_id, 'deli'::draft_pool, t.cat, t.role, t.time_label,
         v_days[i], v_dates[i], t.capacity, t.exp, t.dbl, t.descr,
         (t.sort * 10 + i)
  FROM (VALUES
    -- Deli Shifts (management)
    (1,  'Deli Shifts','Kitchen Lead', NULL,             1, FALSE, FALSE, 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing'),
    (2,  'Deli Shifts','Kitchen Supervisor','8:30AM–12:30PM',1, TRUE,  TRUE,  'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards'),
    (3,  'Deli Shifts','Camp Manager Day','10AM–4PM',     1, FALSE, TRUE,  'Runs daytime camp operations including supply runs, camper issues, and infrastructure'),
    (4,  'Deli Shifts','Camp Manager Day Deputy','10AM–1PM',1, FALSE, FALSE,'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (5,  'Deli Shifts','Camp Manager Day Deputy','1PM–4PM', 1, FALSE, FALSE,'Supports the Day Camp Manager with errands, logistics, and camper coordination'),
    (6,  'Deli Shifts','Camp Manager Night','4PM–10PM',   1, FALSE, TRUE,  'Manages evening camp operations, noise levels, safety, and overnight readiness'),
    (7,  'Deli Shifts','Camp Manager Night Deputy','4PM–7PM',1,FALSE,FALSE,'Assists Night Camp Manager with evening duties and closing procedures'),
    (8,  'Deli Shifts','Camp Manager Night Deputy','7PM–10PM',1,FALSE,FALSE,'Assists Night Camp Manager with evening duties and closing procedures'),
    -- Prep Crew
    (10, 'Prep Crew','Prep Crew','8:30–11:00 AM',         5, FALSE, FALSE, 'Chops, slices, portions, and organizes ingredients for the day''s deli service'),
    -- Order Taker
    (11, 'Order Taker','Order Taker & Counter','9:30–12:00',1, FALSE, FALSE, 'Takes customer orders at the counter with energy and flair'),
    -- Grill
    (12, 'Grill','Grill Lead','9:30–12:00',               1, TRUE,  FALSE, 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely'),
    (13, 'Grill','Grill','9:30–12:00',                    3, FALSE, FALSE, 'Works the flat-top and grill cooking eggs, bacon, and proteins to order'),
    -- Assembly
    (14, 'Assembly','Assembly (Egg + Egg+Cheese)','9:30–12:00',1,FALSE,FALSE,'Assembles egg and egg-and-cheese sandwiches fresh off the grill'),
    (15, 'Assembly','Assembly (Schmearer)','9:30–12:00',  1, FALSE, FALSE, 'Spreads cream cheese, butter, and condiments on bagels and rolls'),
    (16, 'Assembly','Assembly (Bacon)','9:30–12:00',      1, FALSE, FALSE, 'Handles bacon prep, portioning, and adding bacon to sandwich orders'),
    (17, 'Assembly','Assembly (Coffee + Milk)','9:30–12:00',1,FALSE,FALSE, 'Brews and serves coffee and milk; keeps the beverage station stocked and clean'),
    (18, 'Assembly','Assembly (Sandwich Counter)','9:30–12:00',1,FALSE,FALSE,'Final sandwich assembly — wraps, bags, and hands completed orders to runners'),
    -- Runner
    (19, 'Runner','Runner (Assist)','9:30–12:00',         2, FALSE, FALSE, 'Delivers finished orders from the counter to customers and assists where needed'),
    -- Security
    (20, 'Security','Security','10:00–12:30',             1, FALSE, FALSE, 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun'),
    -- Clean-up
    (21, 'Clean-up Crew','Clean-up & Kitchen Reset','12:00–2:30',5,FALSE,FALSE,'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day'),
    -- Entertainers
    (22, 'Entertainers','Entertainer / Bike Manager','10:00–12:30',2,FALSE,FALSE,'Manages the bike valet area and entertains the crowd while they wait'),
    (23, 'Entertainers','Entertainer / Line Manager','10:00–12:30',2,FALSE,FALSE,'Keeps the line moving and entertained with games, banter, or conversation'),
    -- DJ
    (24, 'Music & DJs','DJ','9:30–12:30',                 1, FALSE, FALSE, 'Provides the soundtrack for deli service — sets the vibe and keeps energy high')
  ) AS t(sort, cat, role, time_label, capacity, exp, dbl, descr)
  CROSS JOIN generate_series(1,6) AS i
  ON CONFLICT DO NOTHING;

  -- Special pool: Deep Playa Fri 9/4
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    capacity, requires_exp, counts_double, description, sort_order)
  VALUES
    (p_draft_id,'special','Deep Playa','Kitchen Lead','3PM–6:30PM','Fri', v_dpfri, 1, FALSE, FALSE,
      'Leads kitchen operations for the deep playa soup service', 1000),
    (p_draft_id,'special','Deep Playa','Grill Lead','3PM–6:30PM','Fri', v_dpfri, 1, TRUE, FALSE,
      'Runs the cooking station for the deep playa event', 1001),
    (p_draft_id,'special','Deep Playa','Volunteer Supervisor','3PM–6:30PM','Fri', v_dpfri, 3, FALSE, FALSE,
      'Supervises 15–20 external volunteers from Camp Milk & Honey', 1002),
    (p_draft_id,'special','Deep Playa','Transport & Serving','6:30PM–9PM','Fri', v_dpfri, 4, FALSE, FALSE,
      'Transports prepared food to deep playa and serves 1,000+ attendees', 1003)
  ON CONFLICT DO NOTHING;

  -- Strike pool: Sun 9/6
  INSERT INTO shift_offerings (draft_id, pool, category, role, time_label, day_label, day_date,
    capacity, requires_exp, counts_double, description, note, sort_order)
  VALUES
    (p_draft_id,'strike','Strike','Striker – Deco + Chill Tent','8:30AM–11AM','Sun', v_strike, 4, FALSE, FALSE,
      'Tears down decorations and disassembles the public chill tent', NULL, 2000),
    (p_draft_id,'strike','Strike','Striker – Service Kitchen','8:30AM–11AM','Sun', v_strike, 3, FALSE, FALSE,
      'Breaks down the service kitchen — packs equipment, cleans, and loads out', NULL, 2001),
    (p_draft_id,'strike','Strike','Striker – Plumbing/Shower','8:30AM–11AM','Sun', v_strike, 4, FALSE, FALSE,
      'Disconnects plumbing, drains lines, and disassembles the shower container', NULL, 2002),
    (p_draft_id,'strike','Strike','Striker – Power','8:30AM–11AM','Sun', v_strike, 4, FALSE, FALSE,
      'Disconnects electrical systems, coils cabling, and packs generators', NULL, 2003),
    (p_draft_id,'strike','Strike','Striker – Lighting/Shade/Bikes','8:30AM–11AM','Sun', v_strike, 10, FALSE, FALSE,
      'Removes lighting rigs, shade squares, evap coolers, and bike racks',
      'Sunday departure only — does not count as a regular shift', 2004)
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_after FROM shift_offerings WHERE draft_id = p_draft_id;
  RETURN v_after - v_before;
END $$;

-- =====================================================
-- 15. Grants
-- =====================================================
GRANT EXECUTE ON FUNCTION upsert_camper_ranking(UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_camper_ranking(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION compact_camper_rankings(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION freeze_draft_rankings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unfreeze_draft_rankings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_draft(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION swap_assignments(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION run_auto_draft(UUID, BIGINT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_default_shift_offerings(UUID) TO authenticated;
