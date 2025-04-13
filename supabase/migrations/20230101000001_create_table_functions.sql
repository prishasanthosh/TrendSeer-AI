-- Function to create users table if it doesn't exist
CREATE OR REPLACE FUNCTION create_users_table()
RETURNS void
LANGUAGE plpgsql
AS $
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'users'
  ) THEN
    -- Create the users table
    CREATE TABLE public.users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END;
$;

-- Function to create memories table if it doesn't exist
CREATE OR REPLACE FUNCTION create_memories_table()
RETURNS void
LANGUAGE plpgsql
AS $
BEGIN
  -- Check if the pgvector extension is enabled
  CREATE EXTENSION IF NOT EXISTS vector;

  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'memories'
  ) THEN
    -- Create the memories table
    CREATE TABLE public.memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      content JSONB NOT NULL,
      embedding VECTOR(768), -- Dimension size for Gemini embeddings
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index for vector similarity search
    CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

    -- Create function for similarity search
    CREATE OR REPLACE FUNCTION match_memories(
      query_embedding VECTOR(768),
      match_threshold FLOAT,
      match_count INT,
      p_user_id TEXT
    )
    RETURNS TABLE (
      id UUID,
      content JSONB,
      similarity FLOAT
    )
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        memories.id,
        memories.content,
        1 - (memories.embedding <=> query_embedding) AS similarity
      FROM memories
      WHERE 
        memories.user_id = p_user_id AND
        1 - (memories.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    END;
    $func$;
  END IF;
END;
$;
