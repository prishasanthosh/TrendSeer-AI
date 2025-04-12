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

    console.log("Profile API called for userId:", userId)

    if (!userId) {
      console.error("Profile API: Missing userId")
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    try {
      // Check if the users table exists by trying to query it
      const { data: users, error: userError } = await supabase.from("users").select("id").eq("id", userId).limit(1)

      // If there's an error about the table not existing, we need to inform the user
      if (userError && userError.message.includes("does not exist")) {
        console.error("Profile API: Database tables not set up", userError)
        return new Response(
          JSON.stringify({
            error: "Database not set up properly. Please run the schema.sql script in your Supabase project.",
            setupRequired: true,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // For other user query errors
      if (userError) {
        console.error("Profile API: Database error when checking user", userError)
        return new Response(JSON.stringify({ error: "Database error when checking user" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Return empty profile if database is not set up or user doesn't exist
      // This allows the app to function without errors even if the database isn't ready
      return new Response(
        JSON.stringify({
          userId,
          profile: {
            industries: [],
            audience: "",
            goals: "",
            trends: [],
          },
          memoryCount: 0,
          databaseStatus: users ? "ready" : "not_setup",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (dbError) {
      console.error("Profile API: Database error", dbError)
      // Return an empty profile instead of an error to allow the app to function
      return new Response(
        JSON.stringify({
          userId,
          profile: {
            industries: [],
            audience: "",
            goals: "",
            trends: [],
          },
          memoryCount: 0,
          databaseStatus: "error",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Profile API: Unexpected error", error)
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
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
