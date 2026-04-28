-- =====================================================
-- Migration 052: Auto-Draft enum prep
-- =====================================================
-- ALTER TYPE ... ADD VALUE must be committed before the new
-- values can be used in DEFAULT clauses or casts. We do that
-- here in a stand-alone migration; the rest of the schema
-- changes live in 053_auto_draft.sql.

ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'frozen';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'drafted';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'archived';

DO $$ BEGIN
  CREATE TYPE draft_pool AS ENUM ('deli', 'special', 'strike');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE draft_assignment_source AS ENUM ('ranked', 'random_fill', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
