import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import { StreamingTextResponse, type Message as VercelChatMessage } from "ai"
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

    console.log("Chat API called for userId:", userId)

    // Retrieve user context from memory
    const userContext = await memoryManager.getUserContext(userId)

    // Process the last message
    const lastMessage = messages[messages.length - 1].content

    // Determine tools to use
    const toolsToUse = determineToolsToUse(lastMessage)

    // Fetch real-time data using the appropriate tools
    const realTimeData = await fetchRealTimeData(toolsToUse, lastMessage, userContext)

    // Create system prompt
    const systemPrompt = createSystemPrompt(userContext, realTimeData)

    // Format messages for Gemini
    const geminiMessages = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
    ]

    // Add conversation history
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const role = message.role === "user" ? "user" : "model"
      geminiMessages.push({
        role,
        parts: [{ text: message.content }],
      })
    }

    try {
      // Use Gemini's chat interface instead of generateContentStream
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      })

      console.log("Starting chat with Gemini...")
      const chat = model.startChat({
        history: geminiMessages.slice(0, -1), // All messages except the last one
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      })

      // Get the last user message
      const lastUserMessage = geminiMessages[geminiMessages.length - 1].parts[0].text

      // Send the message and get a streaming response
      const result = await chat.sendMessageStream(lastUserMessage)

      // Create a ReadableStream that the AI SDK can consume
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          try {
            for await (const chunk of result.stream) {
              const text = chunk.text()
              if (text) {
                controller.enqueue(encoder.encode(text))
              }
            }
            controller.close()
          } catch (error) {
            console.error("Error in stream processing:", error)
            controller.error(error)
          }
        },
      })

      // Try to update memory after the response is complete
      setTimeout(async () => {
        try {
          const conversationSummary = await summarizeConversation(messages, lastMessage)
          await memoryManager.updateMemory(userId, conversationSummary)

          // Store the chat message in history
          await storeChatMessage(userId, messages[messages.length - 1], lastMessage)
        } catch (memoryError) {
          console.error("Chat API: Error updating memory:", memoryError)
        }
      }, 0)

      // Return the response using StreamingTextResponse
      return new StreamingTextResponse(stream)
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
    console.error("Error in chat route:", error)
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

// Store chat message in history
async function storeChatMessage(userId: string, userMessage: any, assistantMessage: string) {
  try {
    // Check if chat_history table exists
    const { error: tableCheckError } = await supabase.from("chat_history").select("id").limit(1)

    if (tableCheckError && tableCheckError.message.includes("does not exist")) {
      // Create chat_history table if it doesn't exist
      await supabase.rpc("create_chat_history_table")
    }

    // Insert the chat message
    await supabase.from("chat_history").insert([
      {
        user_id: userId,
        user_message: userMessage.content,
        assistant_message: assistantMessage,
        timestamp: new Date().toISOString(),
      },
    ])
  } catch (error) {
    console.error("Error storing chat message:", error)
  }
}

// Helper function to summarize conversation
async function summarizeConversation(messages: VercelChatMessage[], lastMessage: string) {
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

    // If no JSON format is found, try to parse the whole text
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

  try {
    for (const tool of tools) {
      if (tool === "news-api") {
        try {
          console.log("Fetching news data with API key:", process.env.NEWS_API_KEY?.substring(0, 5) + "...")
          const newsData = await newsApiTool.fetchNews(query, userContext.industries)
          results["news"] = newsData
          console.log("News data fetched successfully:", newsData ? "yes" : "no")
        } catch (error) {
          console.error("Error fetching news data:", error)
          results["news"] = { error: "Failed to fetch news data", articles: [] }
        }
      }

      if (tool === "serper-api") {
        try {
          console.log("Fetching search data with API key:", process.env.SERPER_API_KEY?.substring(0, 5) + "...")
          const searchData = await serperApiTool.search(query, userContext.industries)
          results["search"] = searchData
          console.log("Search data fetched successfully:", searchData ? "yes" : "no")
        } catch (error) {
          console.error("Error fetching search data:", error)
          results["search"] = { error: "Failed to fetch search data", results: [] }
        }
      }
    }
  } catch (error) {
    console.error("Error in fetchRealTimeData:", error)
  }

  return results
}

function createSystemPrompt(userContext: any, realTimeData: any) {
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
