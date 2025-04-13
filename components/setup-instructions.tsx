"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Copy, Database, Check } from "lucide-react"
import { useState } from "react"

export function SetupInstructions() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create memories table with vector support
CREATE TABLE IF NOT EXISTS memories (
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
AS $
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
$;

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chat_history
CREATE INDEX IF NOT EXISTS chat_history_user_id_idx ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS chat_history_timestamp_idx ON chat_history(timestamp);

-- Create helper functions for table creation
CREATE OR REPLACE FUNCTION create_users_table()
RETURNS void
LANGUAGE plpgsql
AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION create_memories_table()
RETURNS void
LANGUAGE plpgsql
AS $func$
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
    AS $f$
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
    $f$;
  END IF;
END;
$func$;

CREATE OR REPLACE FUNCTION create_chat_history_table()
RETURNS void
LANGUAGE plpgsql
AS $func$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'chat_history'
  ) THEN
    -- Create the chat_history table
    CREATE TABLE public.chat_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      user_message TEXT NOT NULL,
      assistant_message TEXT NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index for faster queries
    CREATE INDEX chat_history_user_id_idx ON public.chat_history(user_id);
    CREATE INDEX chat_history_timestamp_idx ON public.chat_history(timestamp);
  END IF;
END;
$func$;`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> Database Setup Required
        </CardTitle>
        <CardDescription>
          TrendSeer AI requires a properly configured database to store user memories and provide personalized insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database tables not found</AlertTitle>
          <AlertDescription>
            The required database tables have not been created in your Supabase project.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Follow these steps to set up your database:</h3>

          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Log in to your Supabase dashboard at{" "}
              <a
                href="https://app.supabase.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                https://app.supabase.io
              </a>
            </li>
            <li>Select your project</li>
            <li>Navigate to the SQL Editor (in the left sidebar)</li>
            <li>Create a new query</li>
            <li>Copy and paste the SQL code below</li>
            <li>Click "Run" to execute the query</li>
            <li>Return to TrendSeer AI and refresh the page</li>
          </ol>

          <div className="relative rounded-md bg-muted p-4">
            <Button variant="outline" size="sm" className="absolute right-2 top-2" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <pre className="text-xs overflow-auto p-2 max-h-80">{sqlScript}</pre>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
        <Button onClick={copyToClipboard}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied!" : "Copy SQL Script"}
        </Button>
      </CardFooter>
    </Card>
  )
}
