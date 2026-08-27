/*
# Add theme and overlay_size columns to settings

1. Modified Tables
- `settings` — add two nullable columns:
  - `theme` (text, default 'dark') — stores the user's theme preference ('dark', 'light', 'midnight').
  - `overlay_size` (text, default 'medium') — stores overlay panel size preference ('small', 'medium', 'large').
  - `overlay_opacity` (integer, default 90) — overlay background opacity percentage (20-100).

2. Security
- No new tables; RLS policies already cover settings CRUD for authenticated owners.

3. Notes
- Uses DO $$ ... IF NOT EXISTS ... END $$ for idempotent column additions.
- Defaults applied so existing rows get sensible values without backfill.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'theme') THEN
    ALTER TABLE settings ADD COLUMN theme text NOT NULL DEFAULT 'dark';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'overlay_size') THEN
    ALTER TABLE settings ADD COLUMN overlay_size text NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'overlay_opacity') THEN
    ALTER TABLE settings ADD COLUMN overlay_opacity integer NOT NULL DEFAULT 90;
  END IF;
END $$;