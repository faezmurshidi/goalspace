-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;

-- Create policies
CREATE POLICY "Users can view their own chat messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = chat_messages.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert chat messages in their spaces"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = chat_messages.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own chat messages"
    ON chat_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = chat_messages.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete their own chat messages"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = chat_messages.space_id
            AND EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = spaces.goal_id
                AND goals.user_id = auth.uid()
            )
        )
    ); 