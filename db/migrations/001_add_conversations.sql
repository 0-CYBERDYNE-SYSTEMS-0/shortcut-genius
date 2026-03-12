-- Seed the default conversation user expected by the chat UI/API.
INSERT INTO users (id, username, password)
OVERRIDING SYSTEM VALUE
VALUES (1, '__conversation_store_default_user__', '__conversation_store_placeholder__')
ON CONFLICT DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1),
  true
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create shortcut_versions table
CREATE TABLE IF NOT EXISTS shortcut_versions (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  shortcut_data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_model TEXT DEFAULT 'gpt-4o',
  preferred_complexity TEXT DEFAULT 'auto' CHECK (preferred_complexity IN ('simple', 'medium', 'complex', 'auto')),
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_shortcut_versions_conversation_id ON shortcut_versions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shortcut_versions_version ON shortcut_versions(conversation_id, version);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
