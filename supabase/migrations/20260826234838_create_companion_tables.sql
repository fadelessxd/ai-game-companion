/*
# AI Game Companion — core tables

1. New Tables
- `conversations` — a session of Q&A between the user and the AI companion.
  - id (uuid, pk), user_id (uuid, owner, default auth.uid()), title (text),
    genre (text, e.g. rpg/strategy/puzzle/general), provider (text), model (text),
    created_at (timestamptz), updated_at (timestamptz)
- `messages` — individual messages within a conversation.
  - id (uuid, pk), conversation_id (uuid fk -> conversations on delete cascade),
    role (text: 'user' | 'assistant'), content (text),
    screenshot_url (text, nullable — Supabase Storage path to captured screenshot),
    created_at (timestamptz)
- `settings` — one row per user storing provider configuration and preferences.
  - id (uuid, pk), user_id (uuid, unique, owner, default auth.uid()),
    provider (text), api_key_enc (text — stored as-is, user-provided),
    model (text), economy_mode (boolean default false),
    genre (text default 'general'), overlay_position (jsonb default '{}'),
    quick_actions (jsonb default '[]'), created_at, updated_at
- `storage` bucket `screenshots` — private bucket for captured game screenshots.

2. Security
- Enable RLS on conversations, messages, settings.
- Owner-scoped CRUD on all tables (auth.uid() = user_id).
- Storage bucket `screenshots` is private; policies restrict to owner.

3. Notes
- user_id defaults to auth.uid() so inserts that omit it succeed.
- messages cascade-delete with their parent conversation.
- settings is per-user (unique user_id) so upsert works.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Session',
  genre text NOT NULL DEFAULT 'general',
  provider text NOT NULL DEFAULT 'openrouter',
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations" ON conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations" ON conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_conversations" ON conversations;
CREATE POLICY "delete_own_conversations" ON conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openrouter',
  api_key_enc text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  economy_mode boolean NOT NULL DEFAULT false,
  genre text NOT NULL DEFAULT 'general',
  overlay_position jsonb NOT NULL DEFAULT '{}'::jsonb,
  quick_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "select_own_screenshots" ON storage.objects;
CREATE POLICY "select_own_screenshots" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'screenshots' AND auth.uid() = owner);

DROP POLICY IF EXISTS "insert_own_screenshots" ON storage.objects;
CREATE POLICY "insert_own_screenshots" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'screenshots' AND auth.uid() = owner);

DROP POLICY IF EXISTS "delete_own_screenshots" ON storage.objects;
CREATE POLICY "delete_own_screenshots" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'screenshots' AND auth.uid() = owner);