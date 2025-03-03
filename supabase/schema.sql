-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 1024),
  category TEXT NOT NULL DEFAULT 'learning' CHECK (category ~ '^[a-z_]+$'),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status goal_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Spaces with improved JSON validation
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 1024),
  category TEXT CHECK (category ~ '^[a-z_]+$'),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  objectives JSONB DEFAULT '{}'::jsonb CHECK (jsonb_array_length(objectives) > 0),
  prerequisites JSONB DEFAULT '{}'::jsonb,
  mentor JSONB DEFAULT '{}'::jsonb CHECK (mentor ?& array['name', 'type']),
  space_color JSONB DEFAULT '{}'::jsonb CHECK (space_color ?& array['primary', 'secondary']),
  order_index INTEGER DEFAULT 0,
  mentor_type TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks with ENUM status and date constraints
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT CHECK (char_length(description) <= 512),
  status task_status DEFAULT 'pending',
  due_date TIMESTAMPTZ CHECK (due_date > created_at),
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT user_space_match CHECK (
    user_id = (SELECT user_id FROM spaces WHERE id = space_id)
  )
);

-- Documents table for knowledge base
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  content TEXT NOT NULL CHECK (content != ''),
  type document_type DEFAULT 'note',
  tags TEXT[] CHECK (array_length(tags, 1) <= 10),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create blog_posts table
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  description TEXT,
  content TEXT NOT NULL CHECK (content != ''),
  author_name TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT array[]::text[] CHECK (array_length(tags, 1) <= 10),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create modules table
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 128),
  content TEXT NOT NULL CHECK (content != ''),
  order_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create document_embeddings table
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
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
    AND table_name IN ('users', 'user_settings', 'goals', 'spaces', 'tasks', 'documents', 'blog_posts', 'modules', 'document_embeddings', 'chat_messages')
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

CREATE POLICY "User blog_posts access" ON blog_posts
  USING (auth.uid() = author_name);

CREATE POLICY "User modules access" ON modules
  USING (auth.uid() = user_id);

CREATE POLICY "User document_embeddings access" ON document_embeddings
  USING (auth.uid() = document_id);

CREATE POLICY "User chat_messages access" ON chat_messages
  USING (auth.uid() = user_id);

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY; 