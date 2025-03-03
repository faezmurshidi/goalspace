-- Migration to consolidate schema changes, functions, and permissions
-- This migration replaces and consolidates functionality from:
-- - 20240328000000_align_schema_changes.sql
-- - 20240328100000_fix_permissions.sql
-- - 20240328200000_revoke_unnecessary_permissions.sql

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS handle_updated_at ON public.goals;
DROP TRIGGER IF EXISTS handle_updated_at ON public.spaces;
DROP TRIGGER IF EXISTS handle_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS handle_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS validate_task_user_id_trigger ON public.tasks;

-- Check if users table exists before dropping triggers
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_users_updated_at ON public.users';
    EXECUTE 'DROP TRIGGER IF EXISTS handle_updated_at ON public.users';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings';
    EXECUTE 'DROP TRIGGER IF EXISTS handle_updated_at ON public.user_settings';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'podcasts') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_podcasts_updated_at ON public.podcasts';
    EXECUTE 'DROP TRIGGER IF EXISTS handle_updated_at ON public.podcasts';
  END IF;
END $$;

-- Drop existing functions that will be replaced
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.validate_task_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_chat_history(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_chat_history(uuid, integer, integer) CASCADE;

-- Create standard function for handling updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create validate_task_user_id function with proper security
CREATE OR REPLACE FUNCTION public.validate_task_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = NEW.space_id
        AND s.user_id = auth.uid()
    ) THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'User does not have access to this space';
    END IF;
END;
$$;

-- Create or replace the get_chat_history function with proper security
CREATE OR REPLACE FUNCTION public.get_chat_history(
    p_space_id uuid,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    space_id uuid,
    user_id uuid,
    role text,
    content text,
    is_faez boolean,
    metadata jsonb,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.space_id,
        cm.user_id,
        cm.role,
        cm.content,
        cm.is_faez,
        cm.metadata,
        cm.created_at
    FROM public.chat_messages cm
    WHERE cm.space_id = p_space_id
    AND EXISTS (
        SELECT 1 FROM public.spaces s
        JOIN public.goals g ON s.goal_id = g.id
        WHERE s.id = cm.space_id
        AND g.user_id = (SELECT auth.uid())
    )
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id)
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create user_settings table if not exists
CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    theme text NOT NULL DEFAULT 'dark',
    api_calls_count integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id),
    UNIQUE (user_id)
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Add module fields if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'modules' AND column_name = 'description') THEN
        ALTER TABLE public.modules ADD COLUMN description text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'modules' AND column_name = 'learning_outcomes') THEN
        ALTER TABLE public.modules ADD COLUMN learning_outcomes text[] DEFAULT '{}';
    END IF;
END $$;

-- Create indexes for better performance
-- Using IF NOT EXISTS for all indexes to avoid conflicts
CREATE INDEX IF NOT EXISTS goals_created_at_idx ON public.goals (created_at);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS spaces_created_at_idx ON public.spaces (created_at);
CREATE INDEX IF NOT EXISTS spaces_goal_id_idx ON public.spaces (goal_id);
CREATE INDEX IF NOT EXISTS spaces_user_id_idx ON public.spaces (user_id);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON public.tasks (created_at);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_space_id_idx ON public.tasks (space_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_modules_order_index ON public.modules (order_index);
CREATE INDEX IF NOT EXISTS idx_modules_space_id ON public.modules (space_id);

-- Create podcasts table if not exists
CREATE TABLE IF NOT EXISTS public.podcasts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    title text NOT NULL,
    audio_url text NOT NULL,
    module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id)
);
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Create indexes for podcasts
CREATE INDEX IF NOT EXISTS podcasts_created_at_idx ON public.podcasts (created_at);
CREATE INDEX IF NOT EXISTS podcasts_space_id_idx ON public.podcasts (space_id);
CREATE INDEX IF NOT EXISTS podcasts_module_id_idx ON public.podcasts (module_id);

-- Create trigger for validating task user_id
DROP TRIGGER IF EXISTS validate_task_user_id_trigger ON public.tasks;
CREATE TRIGGER validate_task_user_id_trigger
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_task_user_id();

-- Create triggers for updated_at columns - check if tables exist first
DO $$ 
BEGIN
  -- For standard tables
  EXECUTE 'CREATE TRIGGER handle_updated_at
      BEFORE UPDATE ON public.goals
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at()';

  EXECUTE 'CREATE TRIGGER handle_updated_at
      BEFORE UPDATE ON public.spaces
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at()';

  EXECUTE 'CREATE TRIGGER handle_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at()';

  EXECUTE 'CREATE TRIGGER handle_updated_at
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at()';

  -- For conditionally created tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    EXECUTE 'CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.user_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'podcasts') THEN
    EXECUTE 'CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.podcasts
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END $$;

-- Drop existing policies before recreating them
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'podcasts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own space podcasts" ON public.podcasts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can read their own space podcasts" ON public.podcasts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own space podcasts" ON public.podcasts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own space podcasts" ON public.podcasts';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow individual read access" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "Allow individual update access" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "Allow signup" ON public.users';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can create own settings" ON public.user_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings';
  END IF;
END $$;

-- Add RLS policies for podcasts with proper security checks
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'podcasts') THEN
    EXECUTE 'CREATE POLICY "Users can insert their own space podcasts" ON public.podcasts
        FOR INSERT TO authenticated
        WITH CHECK (
            space_id IN (
                SELECT s.id FROM public.spaces s
                JOIN public.goals g ON s.goal_id = g.id
                WHERE g.user_id = (SELECT auth.uid())
            )
        )';

    EXECUTE 'CREATE POLICY "Users can read their own space podcasts" ON public.podcasts
        FOR SELECT TO authenticated
        USING (
            space_id IN (
                SELECT s.id FROM public.spaces s
                JOIN public.goals g ON s.goal_id = g.id
                WHERE g.user_id = (SELECT auth.uid())
            )
        )';

    EXECUTE 'CREATE POLICY "Users can update their own space podcasts" ON public.podcasts
        FOR UPDATE TO authenticated
        USING (
            space_id IN (
                SELECT s.id FROM public.spaces s
                JOIN public.goals g ON s.goal_id = g.id
                WHERE g.user_id = (SELECT auth.uid())
            )
        )
        WITH CHECK (
            space_id IN (
                SELECT s.id FROM public.spaces s
                JOIN public.goals g ON s.goal_id = g.id
                WHERE g.user_id = (SELECT auth.uid())
            )
        )';

    EXECUTE 'CREATE POLICY "Users can delete their own space podcasts" ON public.podcasts
        FOR DELETE TO authenticated
        USING (
            space_id IN (
                SELECT s.id FROM public.spaces s
                JOIN public.goals g ON s.goal_id = g.id
                WHERE g.user_id = (SELECT auth.uid())
            )
        )';
  END IF;
END $$;

-- Add RLS policies for users and user_settings
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'CREATE POLICY "Allow individual read access" ON public.users
        FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Allow individual update access" ON public.users
        FOR UPDATE TO authenticated
        USING ((SELECT auth.uid()) = id)
        WITH CHECK ((SELECT auth.uid()) = id)';

    EXECUTE 'CREATE POLICY "Allow signup" ON public.users
        FOR INSERT TO authenticated
        WITH CHECK (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    EXECUTE 'CREATE POLICY "Users can create own settings" ON public.user_settings
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT auth.uid()) = user_id)';

    EXECUTE 'CREATE POLICY "Users can update own settings" ON public.user_settings
        FOR UPDATE TO authenticated
        USING ((SELECT auth.uid()) = user_id)
        WITH CHECK ((SELECT auth.uid()) = user_id)';

    EXECUTE 'CREATE POLICY "Users can view own settings" ON public.user_settings
        FOR SELECT TO authenticated
        USING ((SELECT auth.uid()) = user_id)';
  END IF;
END $$;

-- Fix schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Set proper service_role permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Grant specific permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.podcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;

-- Grant read-only access for anon users where needed
GRANT SELECT ON TABLE public.blog_posts TO anon;
GRANT SELECT ON TABLE public.spaces TO anon;
GRANT SELECT ON TABLE public.goals TO anon;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_history(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_task_user_id() TO authenticated;

-- Grant vector extension functions to authenticated
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated; 