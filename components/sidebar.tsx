"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { UserProfile } from "@/components/user-profile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-browser"
import { MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

interface SidebarProps {
  className?: string
}

interface ChatHistoryItem {
  id: string
  user_message: string
  assistant_message: string
  timestamp: string
  created_at?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAuth()
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchChatHistory()
    }
  }, [user])

  const fetchChatHistory = async () => {
    if (!user) return
  
    console.log("Fetching chat history for user:", user.id) // Debug log
  
    try {
      setLoading(true)
  
      const { error: tableCheckError } = await supabase.from("chat_history").select("id").limit(1)
  
      if (tableCheckError && tableCheckError.message.includes("does not exist")) {
        console.log("Chat history table doesn't exist yet")
        setLoading(false)
        return
      }
  
      let { data, error } = await supabase
        .from("chat_history")
        .select("id, user_message, assistant_message, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
  
      console.log("Initial chat history response:", data) // Debug log
  
      if (error) {
        console.error("Error fetching chat history:", error)
        setLoading(false)
        return
      }
  
      // Check if data is not null
      if (data) {
        // Map created_at to timestamp and set it
        const mappedData = data.map((item) => ({
          ...item,
          timestamp: item.created_at,  // Use created_at as the timestamp
        }))
  
        // Set chat history
        setChatHistory(mappedData)
      } else {
        setChatHistory([])  // If data is null, set an empty array
      }
    } catch (error) {
      console.error("Error in fetchChatHistory:", error)
    } finally {
      setLoading(false)
    }
  }
  
  
  
  // Function to get the timestamp from either field
  const getTimestamp = (item: ChatHistoryItem) => {
    return item.timestamp || item.created_at || new Date().toISOString()
  }

  useEffect(() => {
    // Set up an interval to refresh chat history periodically when the component is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchChatHistory()
      }
    }, 30000) // Refresh every 30 seconds when visible

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("flex flex-col bg-muted/40", className)}>
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <MessageSquare className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <UserProfile userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Recent Conversations</h3>
                <Button variant="ghost" size="sm" onClick={fetchChatHistory} disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>

              <ScrollArea className="h-[500px]">
                {chatHistory.length > 0 ? (
                  <div className="space-y-2">
                    {chatHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <p className="line-clamp-2 font-medium text-sm">{item.user_message}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground mt-1">
                          {item.assistant_message.substring(0, 60)}...
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(getTimestamp(item)), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    {loading ? "Loading chat history..." : "No chat history found"}
                  </p>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>TrendSeer AI &copy; {new Date().getFullYear()}</p>
          {user && <p className="mt-1">Logged in as: {user.email}</p>}
        </div>
      </div>
    </div>
  )
}

export function refreshSidebarChatHistory() {
  // This is a placeholder - we'll use the existing fetchChatHistory function
  // which is already called when the component mounts
  console.log("Refreshing sidebar chat history")
}
