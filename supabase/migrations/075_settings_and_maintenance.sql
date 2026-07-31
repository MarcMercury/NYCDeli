-- =====================================================
-- 075: Settings cleanup + universal maintenance switch
-- =====================================================
-- 1. Add a global maintenance ("stone age") kill switch setting.
-- 2. Drop the never-read `system_active` dead setting (replaced by maintenance_mode).
-- 3. Relax system_settings SELECT to public read: values are non-sensitive
--    config (event dates, camp dimensions, feature flags) and must be readable
--    by anonymous visitors (homepage countdown) and by the proxy kill switch
--    before a session exists. Writes remain admin-only.

-- Global kill switch consumed by src/proxy.ts
INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Dead setting: never read anywhere; superseded by maintenance_mode
DELETE FROM system_settings WHERE key = 'system_active';

-- Make config values publicly readable (writes stay admin-only via existing policy)
DROP POLICY IF EXISTS "system_settings_select_approved" ON system_settings;
DROP POLICY IF EXISTS "Public read" ON system_settings;

CREATE POLICY "system_settings_select_public"
  ON system_settings FOR SELECT
  USING (true);
