-- Migration: Add ENUMs and constraints
--
-- Description: Adds ENUMs and improves table constraints
-- Affected tables: All
-- Author: AI Assistant
-- Date: 2024-03-20

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('active', 'paused', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE theme_type AS ENUM ('dark', 'light', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('guide', 'note', 'resource', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add constraints to existing tables
ALTER TABLE goals
    ADD CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 128),
    ADD CONSTRAINT description_length CHECK (char_length(description) <= 1024),
    ADD CONSTRAINT category_format CHECK (category ~ '^[a-z_]+$'),
    ADD CONSTRAINT progress_range CHECK (progress BETWEEN 0 AND 100);

-- Convert status columns to ENUMs
ALTER TABLE goals 
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE goal_status USING 
        CASE status
            WHEN 'active' THEN 'active'::goal_status
            WHEN 'paused' THEN 'paused'::goal_status
            WHEN 'completed' THEN 'completed'::goal_status
            WHEN 'archived' THEN 'archived'::goal_status
            ELSE 'active'::goal_status
        END,
    ALTER COLUMN status SET DEFAULT 'active'::goal_status;

ALTER TABLE tasks
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE task_status USING 
        CASE status
            WHEN 'pending' THEN 'pending'::task_status
            WHEN 'in_progress' THEN 'in_progress'::task_status
            WHEN 'blocked' THEN 'blocked'::task_status
            WHEN 'completed' THEN 'completed'::task_status
            ELSE 'pending'::task_status
        END,
    ALTER COLUMN status SET DEFAULT 'pending'::task_status;

-- Add remaining constraints
ALTER TABLE spaces
    ADD CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 128),
    ADD CONSTRAINT description_length CHECK (char_length(description) <= 1024),
    ADD CONSTRAINT category_format CHECK (category ~ '^[a-z_]+$'),
    ADD CONSTRAINT progress_range CHECK (progress BETWEEN 0 AND 100),
    ADD CONSTRAINT objectives_array CHECK (jsonb_array_length(objectives) > 0),
    ADD CONSTRAINT mentor_json CHECK (mentor ?& array['name', 'type']),
    ADD CONSTRAINT color_theme_json CHECK (space_color ?& array['primary', 'secondary']);

ALTER TABLE tasks
    ADD CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 128),
    ADD CONSTRAINT description_length CHECK (char_length(description) <= 512),
    ADD CONSTRAINT reasonable_dates CHECK (due_date > created_at);

ALTER TABLE blog_posts
    ADD CONSTRAINT title_length CHECK (char_length(title) BETWEEN 1 AND 128),
    ADD CONSTRAINT content_not_empty CHECK (content != ''),
    ADD CONSTRAINT tags_limit CHECK (array_length(tags, 1) <= 10);

-- Add user_id to tasks table
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a function to validate task user_id matches space user_id
CREATE OR REPLACE FUNCTION validate_task_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id != (SELECT user_id FROM spaces WHERE id = NEW.space_id) THEN
        RAISE EXCEPTION 'Task user_id must match space user_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate task user_id
DROP TRIGGER IF EXISTS validate_task_user_id_trigger ON tasks;
CREATE TRIGGER validate_task_user_id_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_user_id(); 