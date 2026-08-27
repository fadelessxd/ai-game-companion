DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'bubble_size') THEN
    ALTER TABLE settings ADD COLUMN bubble_size integer NOT NULL DEFAULT 48;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'overlay_width') THEN
    ALTER TABLE settings ADD COLUMN overlay_width integer NOT NULL DEFAULT 380;
  END IF;
END $$;