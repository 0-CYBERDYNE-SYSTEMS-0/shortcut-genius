-- Migration: Add shortcut_knowledge_base table
-- Description: Store user's personal iOS Shortcuts as few-shot examples for AI
-- Date: 2026-03-16

-- Create shortcut_knowledge_base table
CREATE TABLE IF NOT EXISTS shortcut_knowledge_base (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  shortcut_name VARCHAR(255) NOT NULL,
  workflow_id VARCHAR(255),
  
  -- Basic metadata
  action_count INTEGER NOT NULL DEFAULT 0,
  run_count INTEGER NOT NULL DEFAULT 0,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  complexity_score INTEGER NOT NULL DEFAULT 0,
  
  -- App and source
  app_bundle_identifier VARCHAR(255),
  source VARCHAR(100),
  gallery_identifier VARCHAR(255),
  
  -- Full action data (ZDATA parsed)
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_sequence TEXT NOT NULL DEFAULT '',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  control_flow JSONB NOT NULL DEFAULT '{}'::jsonb,
  third_party_integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Example management
  is_example BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metadata
  zdata_size INTEGER,
  export_format VARCHAR(20),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_kb_user ON shortcut_knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_tags ON shortcut_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_complexity ON shortcut_knowledge_base(complexity_score);
CREATE INDEX IF NOT EXISTS idx_kb_app ON shortcut_knowledge_base(app_bundle_identifier);
CREATE INDEX IF NOT EXISTS idx_kb_workflow_id ON shortcut_knowledge_base(workflow_id);
CREATE INDEX IF NOT EXISTS idx_kb_is_example ON shortcut_knowledge_base(is_example);

-- Add comment to table
COMMENT ON TABLE shortcut_knowledge_base IS 'Stores user''s personal iOS Shortcuts as few-shot examples for AI prompt context';

-- Add comments to key columns
COMMENT ON COLUMN shortcut_knowledge_base.actions IS 'Complete action array from ZDATA parsing';
COMMENT ON COLUMN shortcut_knowledge_base.action_sequence IS 'Simplified list of action identifiers';
COMMENT ON COLUMN shortcut_knowledge_base.third_party_integrations IS 'Third-party app integrations (e.g., Perplexity, Grok, Claude)';
COMMENT ON COLUMN shortcut_knowledge_base.complexity_score IS 'Calculated complexity: simple(<10), medium(10-30), complex(>30)';
COMMENT ON COLUMN shortcut_knowledge_base.quality_score IS 'User-rated quality (1-10)';
COMMENT ON COLUMN shortcut_knowledge_base.is_example IS 'Flagged as good example for few-shot learning';

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_shortcut_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shortcut_knowledge_base_updated_at
  BEFORE UPDATE ON shortcut_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_shortcut_knowledge_base_updated_at();

-- Migration complete
-- Test with: SELECT * FROM shortcut_knowledge_base LIMIT 1;
