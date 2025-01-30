-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks in own spaces" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in own spaces" ON tasks;

-- Create new policies
CREATE POLICY "Users can view tasks in own spaces"
ON tasks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM spaces s
        WHERE s.id = space_id
        AND EXISTS (
            SELECT 1 FROM goals g
            WHERE g.id = s.goal_id
            AND g.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert tasks in own spaces"
ON tasks FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM spaces s
        WHERE s.id = space_id
        AND EXISTS (
            SELECT 1 FROM goals g
            WHERE g.id = s.goal_id
            AND g.user_id = auth.uid()
        )
    )
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON tasks TO authenticated; 