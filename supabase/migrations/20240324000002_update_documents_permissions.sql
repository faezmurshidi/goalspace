-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON documents TO authenticated;

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