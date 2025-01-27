-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own modules" ON modules;
DROP POLICY IF EXISTS "Users can create own modules" ON modules;
DROP POLICY IF EXISTS "Users can update own modules" ON modules;
DROP POLICY IF EXISTS "Users can delete own modules" ON modules;

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create a policy for authenticated users to view all modules
CREATE POLICY "Enable read access for authenticated users" ON modules
    FOR SELECT
    TO authenticated
    USING (true);

-- Create a policy for authenticated users to insert modules
CREATE POLICY "Enable insert access for authenticated users" ON modules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create a policy for authenticated users to update their own modules
CREATE POLICY "Enable update access for authenticated users" ON modules
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create a policy for authenticated users to delete their own modules
CREATE POLICY "Enable delete access for authenticated users" ON modules
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id); 