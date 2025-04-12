import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  try {
    // Get userId from the URL
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

    if (userError) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get user's memories
    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (memoriesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch user memories" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Extract profile information from memories
    const profile = extractProfileFromMemories(memories || [])

    return new Response(
      JSON.stringify({
        userId,
        profile,
        memoryCount: memories?.length || 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error in user profile route:", error)
    return new Response(JSON.stringify({ error: "An error occurred during the request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

function extractProfileFromMemories(memories: any[]) {
  // Initialize empty profile
  const profile = {
    industries: [] as string[],
    audience: "",
    goals: "",
    trends: [] as string[],
  }

  // Combine all memories
  for (const memory of memories) {
    const content = memory.content

    // Add industries
    if (content.industries && Array.isArray(content.industries)) {
      for (const industry of content.industries) {
        if (!profile.industries.includes(industry)) {
          profile.industries.push(industry)
        }
      }
    }

    // Update audience
    if (content.audience && (!profile.audience || content.audience.length > profile.audience.length)) {
      profile.audience = content.audience
    }

    // Update goals
    if (content.goals && (!profile.goals || content.goals.length > profile.goals.length)) {
      profile.goals = content.goals
    }

    // Add trends
    if (content.trends && Array.isArray(content.trends)) {
      for (const trend of content.trends) {
        if (!profile.trends.includes(trend)) {
          profile.trends.push(trend)
        }
      }
    }
  }

  return profile
}
