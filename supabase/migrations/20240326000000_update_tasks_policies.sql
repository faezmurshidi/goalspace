-- Add INSERT policy for tasks
CREATE POLICY "Users can insert tasks in own spaces"
    ON tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            JOIN goals ON spaces.goal_id = goals.id
            WHERE spaces.id = space_id
            AND goals.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON tasks TO authenticated; 