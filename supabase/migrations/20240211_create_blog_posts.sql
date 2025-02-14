-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
    ON blog_posts
    FOR SELECT
    USING (true);

-- Allow authenticated users to create posts
CREATE POLICY "Allow authenticated create"
    ON blog_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow post authors to update their posts
CREATE POLICY "Allow authors to update their posts"
    ON blog_posts
    FOR UPDATE
    TO authenticated
    USING (author_name = current_user);

-- Allow post authors to delete their posts
CREATE POLICY "Allow authors to delete their posts"
    ON blog_posts
    FOR DELETE
    TO authenticated
    USING (author_name = current_user);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE
    ON blog_posts
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 