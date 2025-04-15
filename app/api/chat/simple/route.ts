import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
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

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Simple Chat API called for userId:", userId)

    // Retrieve user context from memory
    const userContext = await memoryManager.getUserContext(userId)

    // Process the last message to understand the query intent
    const lastMessage = messages[messages.length - 1].content

    // Determine which tools to use based on the query
    const toolsToUse = determineToolsToUse(lastMessage)

    // Fetch real-time data using the appropriate tools
    const realTimeData = await fetchRealTimeData(toolsToUse, lastMessage, userContext)

    // Create a system prompt that includes user context and real-time data
    const systemPrompt = createSystemPrompt(userContext, realTimeData)

    // Prepare messages for the model
    const promptMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ]

    // Generate response using Gemini
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      })

      // Create a text-only prompt from the messages
      const prompt = promptMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n")

      console.log("Sending prompt to Gemini (simple):", prompt.substring(0, 200) + "...")

      const result = await model.generateContent(prompt)
      const response = result.response.text()

      // Try to update memory, but don't worry if it fails
      try {
        if (response && response.length > 0) {
          const conversationSummary = await summarizeConversation(messages, lastMessage)
          if (conversationSummary) {
            await memoryManager.updateMemory(userId, conversationSummary)
          }
        }
      } catch (memoryError) {
        console.error("Chat API: Error updating memory:", memoryError)
      }

      return new Response(
        JSON.stringify({
          role: "assistant",
          content: response,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (modelError) {
      console.error("Error generating content with Gemini:", modelError)
      return new Response(
        JSON.stringify({
          error: "Failed to generate response",
          details: modelError instanceof Error ? modelError.message : String(modelError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Error in simple chat route:", error)
    return new Response(
      JSON.stringify({
        error: "An error occurred during the request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
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
  const results: { [key: string]: any } = {}

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

function createSystemPrompt(userContext: any, realTimeData: any) {
  // Create a system prompt that includes user context and real-time data
  return `
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
  `
}

async function summarizeConversation(messages: any[], lastMessage: string) {
  try {
    // Use Gemini to extract key information from the conversation
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

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

    if (!text) {
      console.error("Empty response from summarization")
      return {
        industries: [],
        audience: "",
        goals: "",
        trends: [],
      }
    }

    // Extract the JSON part from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*?}/)

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ""))
      } catch (parseError) {
        console.error("Error parsing JSON from summary:", parseError)
        return {
          industries: [],
          audience: "",
          goals: "",
          trends: [],
        }
      }
    }

    try {
      return JSON.parse(text)
    } catch (parseError) {
      console.error("Error parsing whole text as JSON:", parseError)
      return {
        industries: [],
        audience: "",
        goals: "",
        trends: [],
      }
    }
  } catch (error) {
    console.error("Error in summarizeConversation:", error)
    // Return a basic structure if parsing fails
    return {
      industries: [],
      audience: "",
      goals: "",
      trends: [],
    }
  }
}
