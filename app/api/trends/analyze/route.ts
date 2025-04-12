import { GoogleGenerativeAI } from "@google/generative-ai"
import { NewsApiTool } from "@/lib/tools/news-api"
import { SerperApiTool } from "@/lib/tools/serper-api"

// Initialize tools
const newsApiTool = new NewsApiTool(process.env.NEWS_API_KEY!)
const serperApiTool = new SerperApiTool(process.env.SERPER_API_KEY!)

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  try {
    const { topic, industries = [] } = await req.json()

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch data from both sources
    const [newsData, searchData] = await Promise.all([
      newsApiTool.fetchNews(topic, industries),
      serperApiTool.search(topic, industries),
    ])

    // Analyze the trend using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const analysisPrompt = `
      Analyze this trend topic: "${topic}"
      
      NEWS DATA:
      ${JSON.stringify(newsData, null, 2)}
      
      SEARCH DATA:
      ${JSON.stringify(searchData, null, 2)}
      
      Provide a comprehensive trend analysis with the following sections:
      1. Overview of the trend
      2. Current popularity and reach
      3. Key influencers or thought leaders
      4. Predicted longevity and future impact
      5. Recommendations for content creators
      
      Format your response as JSON with these keys: overview, popularity, influencers, longevity, recommendations.
    `

    const result = await model.generateContent(analysisPrompt)
    const text = result.response.text()

    try {
      // Extract the JSON part from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*?}/)

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ""))

        return new Response(
          JSON.stringify({
            topic,
            analysis,
            sources: {
              news: newsData.articles?.length || 0,
              search: searchData.results?.length || 0,
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // If no JSON format is found, return the raw text
      return new Response(
        JSON.stringify({
          topic,
          analysis: text,
          sources: {
            news: newsData.articles?.length || 0,
            search: searchData.results?.length || 0,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (error) {
      console.error("Error parsing analysis:", error)
      return new Response(
        JSON.stringify({
          error: "Failed to parse trend analysis",
          rawText: text,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Error in trend analysis route:", error)
    return new Response(JSON.stringify({ error: "An error occurred during the request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
