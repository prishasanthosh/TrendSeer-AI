export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email?: string
        }
        Insert: {
          id: string
          created_at?: string
          email?: string
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          id: string
          user_id: string
          content: Json
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: Json
          embedding?: number[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: Json
          embedding?: number[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          id: string
          user_id: string
          user_message: string
          assistant_message: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_message: string
          assistant_message: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_message?: string
          assistant_message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      match_memories: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          p_user_id: string
        }
        Returns: {
          id: string
          content: Json
          similarity: number
        }[]
      }
      create_users_table: {
        Args: Record<string, never>
        Returns: void
      }
      create_memories_table: {
        Args: Record<string, never>
        Returns: void
      }
      create_chat_history_table: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
