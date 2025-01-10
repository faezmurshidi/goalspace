-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    progress FLOAT DEFAULT 0,
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    mentor_type TEXT NOT NULL,
    progress FLOAT DEFAULT 0,
    space_color JSONB,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table for knowledge base
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for updating timestamps
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update goal progress based on spaces
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE goals
    SET progress = (
        SELECT AVG(progress)
        FROM spaces
        WHERE goal_id = NEW.goal_id
    )
    WHERE id = NEW.goal_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating goal progress
CREATE TRIGGER update_goal_progress_on_space_update
    AFTER UPDATE OF progress ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

-- Set up Row Level Security (RLS)
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for goals
CREATE POLICY "Users can view own goals"
    ON goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
    ON goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
    ON goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
    ON goals FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for spaces
CREATE POLICY "Users can view spaces of own goals"
    ON spaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = spaces.goal_id
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create spaces in own goals"
    ON spaces FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = goal_id
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update spaces in own goals"
    ON spaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = spaces.goal_id
            AND goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete spaces in own goals"
    ON spaces FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = spaces.goal_id
            AND goals.user_id = auth.uid()
        )
    );

-- Create policies for documents
CREATE POLICY "Users can view documents in own spaces"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            JOIN goals ON spaces.goal_id = goals.id
            WHERE spaces.id = documents.space_id
            AND goals.user_id = auth.uid()
        )
    );

-- Create policies for tasks
CREATE POLICY "Users can view tasks in own spaces"
    ON tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            JOIN goals ON spaces.goal_id = goals.id
            WHERE spaces.id = tasks.space_id
            AND goals.user_id = auth.uid()
        )
    );

-- Create policies for chat messages
CREATE POLICY "Users can view messages in own spaces"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            JOIN goals ON spaces.goal_id = goals.id
            WHERE spaces.id = chat_messages.space_id
            AND goals.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_spaces_goal_id ON spaces(goal_id);
CREATE INDEX idx_documents_space_id ON documents(space_id);
CREATE INDEX idx_tasks_space_id ON tasks(space_id);
CREATE INDEX idx_chat_messages_space_id ON chat_messages(space_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id); 