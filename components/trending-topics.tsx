"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, RefreshCw } from "lucide-react"

interface TrendingTopicsProps {
  userId: string
}

interface TrendTopic {
  name: string
  score: number
}

export function TrendingTopics({ userId }: TrendingTopicsProps) {
  const [topics, setTopics] = useState<TrendTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrendingTopics = async () => {
    if (!userId) return

    try {
      setLoading(true)

      // This would be a real API call in production
      // For now, we'll simulate some trending topics
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockTopics = [
        { name: "AI Content Creation", score: 95 },
        { name: "Video Marketing", score: 87 },
        { name: "Sustainable Branding", score: 82 },
        { name: "Voice Search Optimization", score: 78 },
        { name: "Interactive Content", score: 76 },
      ]

      setTopics(mockTopics)
      setError(null)
    } catch (err) {
      console.error("Error fetching trending topics:", err)
      setError("Failed to load trending topics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendingTopics()
  }, [userId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Trending Topics</CardTitle>
          <CardDescription>Popular topics in your industries</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchTrendingTopics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        ) : topics.length > 0 ? (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{topic.name}</span>
                </div>
                <div className="text-xs font-medium text-muted-foreground">{topic.score}/100</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No trending topics found</p>
        )}
      </CardContent>
    </Card>
  )
}
