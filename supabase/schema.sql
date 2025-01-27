-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE goal_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'completed');
CREATE TYPE theme_type AS ENUM ('dark', 'light', 'system');
CREATE TYPE document_type AS ENUM ('guide', 'note', 'resource', 'system');

-- Create users table with improved constraints
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_creation CHECK (created_at <= updated_at)
);

-- User settings with optimized storage
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme theme_type NOT NULL DEFAULT 'dark',
  api_calls_count INTEGER NOT NULL DEFAULT 0 CHECK (api_calls_count >= 0),
  timezone TEXT NOT NULL DEFAULT 'UTC' CHECK (timezone ~ '^[A-Za-z_/]+$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goals with status ENUM and progress validation
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 1024),
  category TEXT NOT NULL DEFAULT 'learning' CHECK (category ~ '^[a-z_]+$'),
  status goal_status NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  target_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reasonable_dates CHECK (target_date > created_at)
);

-- Spaces with improved JSON validation
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 1024),
  category TEXT NOT NULL DEFAULT 'learning' CHECK (category ~ '^[a-z_]+$'),
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_array_length(objectives) > 0),
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  mentor JSONB CHECK (mentor ?& array['name', 'type']),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  color_theme JSONB CHECK (color_theme ?& array['primary', 'secondary']),
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks with ENUM status and date constraints
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 512),
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ CHECK (due_date > created_at),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table for knowledge base
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  content TEXT NOT NULL CHECK (content != ''),
  type document_type NOT NULL DEFAULT 'note',
  tags TEXT[] CHECK (array_length(tags, 1) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index optimization
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_spaces_goal_user ON spaces(goal_id, user_id);
CREATE INDEX idx_tasks_space_status ON tasks(space_id, status);
CREATE INDEX idx_documents_space_type ON documents(space_id, type);

-- Single trigger function for all tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers using loop
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'user_settings', 'goals', 'spaces', 'tasks', 'documents')
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', 
                  'update_' || tbl || '_timestamp',
                  tbl);
  END LOOP;
END;
$$;

-- Enhanced RLS policies
CREATE POLICY "User data isolation" ON users
  USING (auth.uid() = id);

CREATE POLICY "User settings isolation" ON user_settings
  USING (auth.uid() = user_id);

CREATE POLICY "User goals access" ON goals
  USING (auth.uid() = user_id);

CREATE POLICY "User spaces access" ON spaces
  USING (auth.uid() = user_id);

CREATE POLICY "User tasks access" ON tasks
  USING (auth.uid() = user_id);

CREATE POLICY "User documents access" ON documents
  USING (auth.uid() = user_id);

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY; 