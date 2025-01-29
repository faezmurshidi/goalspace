-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_modules_space_id ON modules(space_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(space_id, order_index);

-- Create trigger for updating timestamps
CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view modules for spaces they have access to"
    ON modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = modules.space_id
            AND spaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update modules for spaces they own"
    ON modules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = modules.space_id
            AND spaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert modules for spaces they own"
    ON modules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = modules.space_id
            AND spaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete modules for spaces they own"
    ON modules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = modules.space_id
            AND spaces.user_id = auth.uid()
        )
    ); 