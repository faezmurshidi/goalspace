-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tutorial', 'guide', 'reference', 'exercise')),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Policy to allow users to select their own documents
CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = documents.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

-- Policy to allow users to insert their own documents
CREATE POLICY "Users can insert their own documents"
    ON documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = documents.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

-- Policy to allow users to update their own documents
CREATE POLICY "Users can update their own documents"
    ON documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = documents.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

-- Policy to allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = documents.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
