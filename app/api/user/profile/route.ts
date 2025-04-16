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

    // ✅ Skip Supabase logic during preview builds to prevent deployment errors
    if (
      process.env.VERCEL_ENV === "preview" ||
      process.env.NODE_ENV === "development"
    ) {
      console.warn("Skipping Supabase query during build/preview...")
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
          databaseStatus: "skipped_build",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Try fetching user from Supabase
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .limit(1)

    if (userError?.message.includes("does not exist")) {
      console.error("Profile API: Table missing - likely setup issue", userError)
      return new Response(
        JSON.stringify({
          error:
            "Database not set up properly. Please run the schema.sql script in your Supabase project.",
          setupRequired: true,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (userError) {
      console.error("Profile API: Query error", userError)
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

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
      }
    )
  } catch (error) {
    console.error("Profile API: Unexpected error", error)
    return new Response(JSON.stringify({ error: "Unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Optional helper (can be used when merging profile memory data)
function extractProfileFromMemories(memories: any[]) {
  const profile = {
    industries: [] as string[],
    audience: "",
    goals: "",
    trends: [] as string[],
  }

  for (const memory of memories) {
    const content = memory.content

    if (Array.isArray(content.industries)) {
      for (const industry of content.industries) {
        if (!profile.industries.includes(industry)) {
          profile.industries.push(industry)
        }
      }
    }

    if (
      content.audience &&
      (!profile.audience || content.audience.length > profile.audience.length)
    ) {
      profile.audience = content.audience
    }

    if (
      content.goals &&
      (!profile.goals || content.goals.length > profile.goals.length)
    ) {
      profile.goals = content.goals
    }

    if (Array.isArray(content.trends)) {
      for (const trend of content.trends) {
        if (!profile.trends.includes(trend)) {
          profile.trends.push(trend)
        }
      }
    }
  }

  return profile
}
