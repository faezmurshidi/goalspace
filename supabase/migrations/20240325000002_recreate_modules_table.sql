-- First, drop the existing table and its dependencies
DROP TABLE IF EXISTS modules CASCADE;

-- Create the modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    learning_outcomes TEXT[] DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_space
        FOREIGN KEY(space_id) 
        REFERENCES spaces(id)
        ON DELETE CASCADE
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow users to view modules in spaces they have access to
CREATE POLICY "Users can view modules in their spaces"
ON modules FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = modules.space_id
        AND g.user_id = auth.uid()
    )
);

-- Allow users to insert modules for spaces they have access to
CREATE POLICY "Users can insert modules in their spaces"
ON modules FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = space_id
        AND g.user_id = auth.uid()
    )
);

-- Allow users to update modules in spaces they have access to
CREATE POLICY "Users can update modules in their spaces"
ON modules FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = modules.space_id
        AND g.user_id = auth.uid()
    )
);

-- Allow users to delete modules in their spaces
CREATE POLICY "Users can delete modules in their spaces"
ON modules FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = modules.space_id
        AND g.user_id = auth.uid()
    )
);

-- Create indexes for better performance
CREATE INDEX idx_modules_space_id ON modules(space_id);
CREATE INDEX idx_modules_order_index ON modules(order_index);

-- Grant necessary permissions to authenticated users
GRANT ALL ON modules TO authenticated; 