"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { UserProfile } from "@/components/user-profile"
import { TrendingTopics } from "@/components/trending-topics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    // Get user ID from localStorage
    try {
      const storedUserId = localStorage.getItem("trendseer_user_id")
      if (storedUserId) {
        setUserId(storedUserId)
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [])

  return (
    <div className={cn("flex flex-col bg-muted/40", className)}>
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          {!userId && (
            <div className="mt-4 rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
              Loading user profile...
            </div>
          )}
          <TabsContent value="profile" className="mt-4">
            <UserProfile userId={userId} />
          </TabsContent>
          <TabsContent value="trends" className="mt-4">
            <TrendingTopics userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>TrendSeer AI &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}
