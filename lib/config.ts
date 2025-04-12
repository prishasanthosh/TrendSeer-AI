export const config = {
  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  newsApiKey: process.env.NEWS_API_KEY || "",
  serperApiKey: process.env.SERPER_API_KEY || "",

  // Supabase Configuration
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // Application Settings
  maxResponseDuration: 300, // 5 minutes
  memoryThreshold: 0.7, // Similarity threshold for memory retrieval
  maxMemoriesToRetrieve: 5, // Maximum number of memories to retrieve

  // Model Configuration
  chatModel: "gemini-1.5-pro",
  embeddingModel: "embedding-001",

  // Feature Flags
  enableRealTimeData: true,
  enableMemory: true,
  enableDebugMode: process.env.NODE_ENV === "development",
}
