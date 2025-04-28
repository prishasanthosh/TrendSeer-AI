import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new NextResponse(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("chat_history")
    .select("*")
    //.eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chat history:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch chat history" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new NextResponse(
    JSON.stringify({ chatHistory: data }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
