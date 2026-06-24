-- =====================================================
-- 068: Auto-draft scheduling rules
--   Rule A (all campers): no camper may work more than ONE shift per day.
--   Rule B (unranked picks): when a camper has no remaining ranked choice,
--          assign the EARLIEST-in-the-week available shift on a day they
--          are not already signed up for.
-- Re-creates run_auto_draft() from migration 053 with these two rules.
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

        -- Highest-ranked still-available offering in date window.
        -- Rule A: skip any day the camper is already assigned to (any pool).
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
           AND (o.day_date IS NULL OR NOT EXISTS (
             SELECT 1 FROM tmp_assignments a2
               JOIN shift_offerings o2 ON o2.id = a2.offering_id
              WHERE a2.camper_id = v_camper.camper_id
                AND o2.day_date = o.day_date
           ))
         ORDER BY r.rank ASC
         LIMIT 1;

        IF v_offering.id IS NULL THEN
          -- Fallback (unranked or no remaining ranked choice):
          -- earliest-in-the-week available shift on a day not already taken.
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
             AND (o.day_date IS NULL OR NOT EXISTS (
               SELECT 1 FROM tmp_assignments a2
                 JOIN shift_offerings o2 ON o2.id = a2.offering_id
                WHERE a2.camper_id = v_camper.camper_id
                  AND o2.day_date = o.day_date
             ))
           ORDER BY o.day_date ASC NULLS LAST, o.sort_order ASC, random()
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

GRANT EXECUTE ON FUNCTION run_auto_draft(UUID, BIGINT, BOOLEAN) TO authenticated;
