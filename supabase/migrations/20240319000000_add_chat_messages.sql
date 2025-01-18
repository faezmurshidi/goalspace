-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_faez BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

  -- Add indexes for common queries
  CONSTRAINT chat_messages_space_id_created_at_idx
    UNIQUE (space_id, created_at)
);

-- Add RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add RLS policies
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (
    -- Users can view messages in spaces they have access to
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = chat_messages.space_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    -- Users can insert messages in spaces they have access to
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages FOR DELETE
  USING (
    -- Users can delete messages in spaces they have access to
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = chat_messages.space_id
      AND s.user_id = auth.uid()
    )
  );

-- Create function to get chat history with pagination
CREATE OR REPLACE FUNCTION get_chat_history(
  p_space_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  space_id UUID,
  user_id UUID,
  role TEXT,
  content TEXT,
  is_faez BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
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
  FROM chat_messages cm
  WHERE cm.space_id = p_space_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_chat_history(UUID, INTEGER, INTEGER) TO authenticated;
