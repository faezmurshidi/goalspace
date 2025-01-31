-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI's text-embedding-3-small dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for faster similarity searches
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add RLS policies
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON document_embeddings TO authenticated;

-- Policy to allow users to select their own document embeddings
CREATE POLICY "Users can view their own document embeddings"
    ON document_embeddings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_embeddings.document_id
            AND EXISTS (
                SELECT 1 FROM spaces
                WHERE spaces.id = documents.space_id
                AND EXISTS (
                    SELECT 1 FROM goals
                    WHERE goals.id = spaces.goal_id
                    AND goals.user_id = auth.uid()
                )
            )
        )
    );

-- Policy to allow users to insert their own document embeddings
CREATE POLICY "Users can insert their own document embeddings"
    ON document_embeddings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents
            WHERE documents.id = document_embeddings.document_id
            AND EXISTS (
                SELECT 1 FROM spaces
                WHERE spaces.id = documents.space_id
                AND EXISTS (
                    SELECT 1 FROM goals
                    WHERE goals.id = spaces.goal_id
                    AND goals.user_id = auth.uid()
                )
            )
        )
    );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 