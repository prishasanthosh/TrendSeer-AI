import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import { StreamingTextResponse, type Message as VercelChatMessage } from "ai"
import { GoogleGenerativeAIStream } from "ai"
import { NewsApiTool } from "@/lib/tools/news-api"
import { SerperApiTool } from "@/lib/tools/serper-api"
import { MemoryManager } from "@/lib/memory-manager"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Initialize tools
const newsApiTool = new NewsApiTool(process.env.NEWS_API_KEY!)
const serperApiTool = new SerperApiTool(process.env.SERPER_API_KEY!)

// Initialize memory manager
const memoryManager = new MemoryManager(supabase)

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

export async function POST(req: Request) {
  try {
    const { messages, userId } = await req.json()

    // Retrieve user context from memory
    const userContext = await memoryManager.getUserContext(userId)

    // Process the last message to understand the query intent
    const lastMessage = messages[messages.length - 1].content

    // Determine which tools to use based on the query
    const toolsToUse = determineToolsToUse(lastMessage)

    // Fetch real-time data using the appropriate tools
    const realTimeData = await fetchRealTimeData(toolsToUse, lastMessage, userContext)

    // Combine user context with real-time data
    const enhancedPrompt = createEnhancedPrompt(messages, userContext, realTimeData)

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const result = await model.generateContentStream(enhancedPrompt)
    const stream = GoogleGenerativeAIStream(result)

    // Update memory with new information from this conversation
    const conversationSummary = await summarizeConversation(messages, lastMessage)
    await memoryManager.updateMemory(userId, conversationSummary)

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error("Error in chat route:", error)
    return new Response(JSON.stringify({ error: "An error occurred during the request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Helper functions
function determineToolsToUse(message: string) {
  const tools = []

  if (
    message.toLowerCase().includes("news") ||
    message.toLowerCase().includes("articles") ||
    message.toLowerCase().includes("publications")
  ) {
    tools.push("news-api")
  }

  if (
    message.toLowerCase().includes("search") ||
    message.toLowerCase().includes("trends") ||
    message.toLowerCase().includes("online")
  ) {
    tools.push("serper-api")
  }

  return tools
}

async function fetchRealTimeData(tools: string[], query: string, userContext: any) {
  const results = {}

  for (const tool of tools) {
    if (tool === "news-api") {
      const newsData = await newsApiTool.fetchNews(query, userContext.industries)
      results["news"] = newsData
    }

    if (tool === "serper-api") {
      const searchData = await serperApiTool.search(query, userContext.industries)
      results["search"] = searchData
    }
  }

  return results
}

function createEnhancedPrompt(messages: VercelChatMessage[], userContext: any, realTimeData: any) {
  // Format the conversation history
  const formattedMessages = messages.map((m) => `${m.role}: ${m.content}`).join("\n")

  // Create a system prompt that includes user context and real-time data
  const systemPrompt = `
    You are TrendSeer AI, an advanced trend analysis assistant.
    
    USER CONTEXT:
    Industries of interest: ${userContext.industries?.join(", ") || "Not specified yet"}
    Target audience: ${userContext.audience || "Not specified yet"}
    Content strategy goals: ${userContext.goals || "Not specified yet"}
    Previously discussed trends: ${userContext.previousTrends?.join(", ") || "None yet"}
    
    REAL-TIME DATA:
    ${JSON.stringify(realTimeData, null, 2)}
    
    Your task is to analyze trends based on the user's query and provide insightful analysis.
    Compare current trends with historical patterns when relevant.
    Be specific and actionable in your recommendations.
    
    CONVERSATION HISTORY:
    ${formattedMessages}
  `

  return systemPrompt
}

async function summarizeConversation(messages: VercelChatMessage[], lastMessage: string) {
  // Use Gemini to extract key information from the conversation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })

  const summaryPrompt = `
    Analyze this conversation and extract the following information:
    1. Industries mentioned
    2. Target audience demographics
    3. Content strategy goals
    4. Trends discussed
    
    Format your response as JSON with these keys: industries, audience, goals, trends.
    
    Conversation:
    ${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
  `

  const result = await model.generateContent(summaryPrompt)
  const text = result.response.text()

  try {
    // Extract the JSON part from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*?}/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ""))
    }

    // If no JSON format is found, try to parse the whole text
    return JSON.parse(text)
  } catch (error) {
    console.error("Error parsing summary:", error)
    // Return a basic structure if parsing fails
    return {
      industries: [],
      audience: "",
      goals: "",
      trends: [],
    }
  }
}
