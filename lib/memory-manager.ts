import type { SupabaseClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

export class MemoryManager {
  private supabase: SupabaseClient
  private genAI: GoogleGenerativeAI

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }

  async getUserContext(userId: string) {
    try {
      // Check if user exists in the database
      const { data: userExists, error: userCheckError } = await this.supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single()

      if (userCheckError || !userExists) {
        // Create new user if doesn't exist
        await this.supabase.from("users").insert([{ id: userId }])

        return {
          industries: [],
          audience: "",
          goals: "",
          previousTrends: [],
        }
      }

      // Get user memory vectors
      const { data: memories, error: memoriesError } = await this.supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (memoriesError) {
        console.error("Error fetching memories:", memoriesError)
        return {
          industries: [],
          audience: "",
          goals: "",
          previousTrends: [],
        }
      }

      // If no memories exist yet, return empty context
      if (!memories || memories.length === 0) {
        return {
          industries: [],
          audience: "",
          goals: "",
          previousTrends: [],
        }
      }

      // Consolidate memories into a user context
      return this.consolidateMemories(memories)
    } catch (error) {
      console.error("Error in getUserContext:", error)
      return {
        industries: [],
        audience: "",
        goals: "",
        previousTrends: [],
      }
    }
  }

  async updateMemory(userId: string, newMemory: any) {
    try {
      // Generate embeddings for the memory
      const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" })

      // Convert memory to string for embedding
      const memoryString = JSON.stringify(newMemory)

      const embeddingResult = await embeddingModel.embedContent(memoryString)
      const embedding = embeddingResult.embedding.values

      // Store the memory with its embedding
      await this.supabase.from("memories").insert([
        {
          user_id: userId,
          content: newMemory,
          embedding: embedding,
        },
      ])

      return true
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
      // Generate embedding for the query
      const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" })
      const embeddingResult = await embeddingModel.embedContent(query)
      const queryEmbedding = embeddingResult.embedding.values

      // Search for similar memories using vector similarity
      const { data: similarMemories, error } = await this.supabase.rpc("match_memories", {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        p_user_id: userId,
      })

      if (error) {
        console.error("Error searching similar memories:", error)
        return []
      }

      return similarMemories
    } catch (error) {
      console.error("Error in searchSimilarMemories:", error)
      return []
    }
  }
}
