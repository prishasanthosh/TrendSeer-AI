-- Create a function to create the chat_history table if it doesn't exist
CREATE OR REPLACE FUNCTION create_chat_history_table()
RETURNS void
LANGUAGE plpgsql
AS $$
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create index for faster queries
    CREATE INDEX chat_history_user_id_idx ON public.chat_history(user_id);
    CREATE INDEX chat_history_created_at_idx ON public.chat_history(created_at);
  END IF;
END;
$$;
