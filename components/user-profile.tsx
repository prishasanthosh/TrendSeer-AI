"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface UserProfileProps {
  userId: string
}

interface ProfileData {
  industries: string[]
  audience: string
  goals: string
  trends: string[]
}

export function UserProfile({ userId }: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchProfile() {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Fetching profile for user:", userId)

        const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Profile API error:", response.status, errorData)
          throw new Error(`Failed to fetch profile: ${response.status}`)
        }

        const data = await response.json()
        console.log("Profile data received:", data)

        if (data && data.profile) {
          setProfile(data.profile)
        } else {
          console.warn("No profile data in response")
          setProfile({
            industries: [],
            audience: "",
            goals: "",
            trends: [],
          })
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
        setError("Failed to load profile data. Please try refreshing.")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!profile || (!profile.industries.length && !profile.audience && !profile.goals)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Start chatting to build your profile. TrendSeer AI will learn about your interests and preferences.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Industries</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.industries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.industries.map((industry) => (
                <Badge key={industry} variant="secondary">
                  {industry}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No industries identified yet</p>
          )}
        </CardContent>
      </Card>

      {profile.audience && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{profile.audience}</p>
          </CardContent>
        </Card>
      )}

      {profile.goals && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Content Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{profile.goals}</p>
          </CardContent>
        </Card>
      )}

      {profile.trends && profile.trends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Previously Discussed Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.trends.map((trend) => (
                <Badge key={trend} variant="outline">
                  {trend}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
