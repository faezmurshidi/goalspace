-- Drop existing table if it exists
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    metadata JSONB DEFAULT '{}'::jsonb,
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
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow users to view messages in spaces they have access to
CREATE POLICY "Users can view messages in their spaces"
ON chat_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = chat_messages.space_id
        AND g.user_id = auth.uid()
    )
);

-- Allow users to insert messages in spaces they have access to
CREATE POLICY "Users can insert messages in their spaces"
ON chat_messages FOR INSERT
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

-- Allow users to update messages in their spaces
CREATE POLICY "Users can update messages in their spaces"
ON chat_messages FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = chat_messages.space_id
        AND g.user_id = auth.uid()
    )
);

-- Allow users to delete messages in their spaces
CREATE POLICY "Users can delete messages in their spaces"
ON chat_messages FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM spaces s
        JOIN goals g ON s.goal_id = g.id
        WHERE s.id = chat_messages.space_id
        AND g.user_id = auth.uid()
    )
);

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_space_id ON chat_messages(space_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Grant necessary permissions to authenticated users
GRANT ALL ON chat_messages TO authenticated;
