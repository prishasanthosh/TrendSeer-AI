import type { SupabaseClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

export class MemoryManager {
  private supabase: SupabaseClient
  private genAI: GoogleGenerativeAI
  private databaseReady = false
  private usersTableExists = false
  private memoriesTableExists = false

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    // Check if database is set up
    this.checkDatabaseSetup()
  }

  private async checkDatabaseSetup() {
    try {
      // Check if users table exists
      const { data: usersData, error: usersError } = await this.supabase.from("users").select("id").limit(1)

      if (usersError) {
        if (this.errorMessageIncludes(usersError, "does not exist")) {
          console.error("Users table does not exist:", usersError)
          this.usersTableExists = false
        } else {
          console.error("Error checking users table:", usersError)
          this.usersTableExists = true // Assume it exists but there was another error
        }
      } else {
        this.usersTableExists = true
      }

      // Check if memories table exists
      const { data: memoriesData, error: memoriesError } = await this.supabase.from("memories").select("id").limit(1)

      if (memoriesError) {
        if (this.errorMessageIncludes(memoriesError, "does not exist")) {
          console.error("Memories table does not exist:", memoriesError)
          this.memoriesTableExists = false
        } else {
          console.error("Error checking memories table:", memoriesError)
          this.memoriesTableExists = true // Assume it exists but there was another error
        }
      } else {
        this.memoriesTableExists = true
      }

      // Database is ready if both tables exist
      this.databaseReady = this.usersTableExists && this.memoriesTableExists
      console.log(
        `Database status: ${this.databaseReady ? "Ready" : "Not ready"} (Users: ${this.usersTableExists}, Memories: ${this.memoriesTableExists})`,
      )
    } catch (error) {
      console.error("Error checking database setup:", error)
      this.databaseReady = false
      this.usersTableExists = false
      this.memoriesTableExists = false
    }
  }

  // Helper method to safely check if an error message includes a string
  private errorMessageIncludes(error: any, text: string): boolean {
    return (
      error &&
      typeof error === "object" &&
      error.message &&
      typeof error.message === "string" &&
      error.message.includes(text)
    )
  }

  async getUserContext(userId: string) {
    try {
      if (!userId) {
        console.error("getUserContext: No userId provided")
        return this.getEmptyContext()
      }

      console.log("Getting user context for:", userId)

      // If database is not ready, return empty context
      if (!this.databaseReady) {
        console.log("Database not ready, returning empty context")
        return this.getEmptyContext()
      }

      // If memories table doesn't exist, return empty context
      if (!this.memoriesTableExists) {
        console.log("Memories table doesn't exist, returning empty context")
        return this.getEmptyContext()
      }

      // Try to query the memories table
      try {
        const { data: memories, error: memoriesError } = await this.supabase
          .from("memories")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (memoriesError) {
          if (this.errorMessageIncludes(memoriesError, "does not exist")) {
            console.error("Memories table does not exist:", memoriesError)
            // Update our state to reflect that the memories table doesn't exist
            this.memoriesTableExists = false
            this.databaseReady = false
            return this.getEmptyContext()
          }

          console.error("Error fetching memories:", memoriesError)
          return this.getEmptyContext()
        }

        // If no memories exist yet, return empty context
        if (!memories || memories.length === 0) {
          return this.getEmptyContext()
        }

        // Consolidate memories into a user context
        return this.consolidateMemories(memories)
      } catch (error) {
        console.error("Error querying memories table:", error)
        return this.getEmptyContext()
      }
    } catch (error) {
      console.error("Error in getUserContext:", error)
      return this.getEmptyContext()
    }
  }

  // Helper method to return a consistent empty context
  private getEmptyContext() {
    return {
      industries: [],
      audience: "",
      goals: "",
      previousTrends: [],
    }
  }

  async updateMemory(userId: string, newMemory: any) {
    try {
      if (!userId) {
        console.error("updateMemory: No userId provided")
        return false
      }

      // If database is not ready, don't try to update memory
      if (!this.databaseReady) {
        console.log("Database not ready, skipping memory update")
        return false
      }

      // If either table doesn't exist, don't try to update memory
      if (!this.usersTableExists || !this.memoriesTableExists) {
        console.log("Required tables don't exist, skipping memory update")
        return false
      }

      // Try to check if user exists and create if needed
      try {
        const { data: users, error: userCheckError } = await this.supabase.from("users").select("id").eq("id", userId)

        if (userCheckError) {
          if (this.errorMessageIncludes(userCheckError, "does not exist")) {
            console.error("Users table does not exist:", userCheckError)
            this.usersTableExists = false
            this.databaseReady = false
            return false
          }

          console.error("Error checking if user exists:", userCheckError)
          return false
        }

        // If user doesn't exist, try to create one
        if (!users || users.length === 0) {
          const { error: createError } = await this.supabase.from("users").insert([{ id: userId }])

          if (createError) {
            if (this.errorMessageIncludes(createError, "does not exist")) {
              console.error("Users table does not exist:", createError)
              this.usersTableExists = false
              this.databaseReady = false
              return false
            }

            console.error("Error creating user:", createError)
            return false
          }
        }
      } catch (error) {
        console.error("Error checking/creating user:", error)
        return false
      }

      // Try to generate embeddings and store memory
      try {
        // Generate embeddings for the memory
        const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" })

        // Convert memory to string for embedding
        const memoryString = JSON.stringify(newMemory)

        const embeddingResult = await embeddingModel.embedContent(memoryString)
        const embedding = embeddingResult.embedding.values

        // Try to store the memory
        const { error: insertError } = await this.supabase.from("memories").insert([
          {
            user_id: userId,
            content: newMemory,
            embedding: embedding,
          },
        ])

        if (insertError) {
          if (this.errorMessageIncludes(insertError, "does not exist")) {
            console.error("Memories table does not exist:", insertError)
            this.memoriesTableExists = false
            this.databaseReady = false
            return false
          }

          console.error("Error inserting memory:", insertError)
          return false
        }

        return true
      } catch (error) {
        console.error("Error generating embeddings or storing memory:", error)
        return false
      }
    } catch (error) {
      console.error("Error updating memory:", error)
      return false
    }
  }

  private consolidateMemories(memories: any[]) {
    // Initialize empty context
    const context = {
      industries: [] as string[],
      audience: "",
      goals: "",
      previousTrends: [] as string[],
    }

    // Combine all memories
    for (const memory of memories) {
      const content = memory.content

      // Add industries if they don't already exist in the context
      if (content.industries && Array.isArray(content.industries)) {
        for (const industry of content.industries) {
          if (!context.industries.includes(industry)) {
            context.industries.push(industry)
          }
        }
      }

      // Update audience if it exists and is more detailed
      if (content.audience && (!context.audience || content.audience.length > context.audience.length)) {
        context.audience = content.audience
      }

      // Update goals if they exist and are more detailed
      if (content.goals && (!context.goals || content.goals.length > context.goals.length)) {
        context.goals = content.goals
      }

      // Add trends if they don't already exist in the context
      if (content.trends && Array.isArray(content.trends)) {
        for (const trend of content.trends) {
          if (!context.previousTrends.includes(trend)) {
            context.previousTrends.push(trend)
          }
        }
      }
    }

    return context
  }

  async searchSimilarMemories(userId: string, query: string, limit = 5) {
    try {
      if (!userId) {
        console.error("searchSimilarMemories: No userId provided")
        return []
      }

      // If database is not ready or memories table doesn't exist, return empty array
      if (!this.databaseReady || !this.memoriesTableExists) {
        console.log("Database not ready or memories table doesn't exist, skipping memory search")
        return []
      }

      // Generate embedding for the query
      const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" })
      const embeddingResult = await embeddingModel.embedContent(query)
      const queryEmbedding = embeddingResult.embedding.values

      // Try to search for similar memories
      try {
        const { data: similarMemories, error } = await this.supabase.rpc("match_memories", {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: limit,
          p_user_id: userId,
        })

        if (error) {
          if (this.errorMessageIncludes(error, "does not exist")) {
            console.error("match_memories function does not exist:", error)
            return []
          }

          console.error("Error searching similar memories:", error)
          return []
        }

        return similarMemories || []
      } catch (error) {
        console.error("Error calling match_memories function:", error)
        return []
      }
    } catch (error) {
      console.error("Error in searchSimilarMemories:", error)
      return []
    }
  }
}
