"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SetupInstructions } from "@/components/setup-instructions"

interface UserProfileProps {
  userId: string
}

interface ProfileData {
  industries: string[]
  audience: string
  goals: string
  trends: string[]
}

const ProfileCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
)

export function UserProfile({ userId }: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)

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

        const token = localStorage.getItem("authToken")

        const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Profile API error:", response.status, data)

          if (data?.setupRequired) {
            setSetupRequired(true)
            setError("Database setup required")
          } else if (response.status === 401) {
            setError("Unauthorized: Please log in again.")
          } else {
            setError(`Failed to fetch profile: ${data?.error || response.status}`)
          }
          return
        }

        if (data?.profile) {
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

        if (data.databaseStatus === "not_setup" || data.setupRequired) {
          setSetupRequired(true)
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

  if (setupRequired) {
    return <SetupInstructions />
  }

  if (error && !setupRequired) {
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
      <ProfileCard title="Industries">
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
      </ProfileCard>

      {profile.audience && (
        <ProfileCard title="Target Audience">
          <p className="text-sm">{profile.audience}</p>
        </ProfileCard>
      )}

      {profile.goals && (
        <ProfileCard title="Content Goals">
          <p className="text-sm">{profile.goals}</p>
        </ProfileCard>
      )}

      {profile.trends && profile.trends.length > 0 && (
        <ProfileCard title="Previously Discussed Trends">
          <div className="flex flex-wrap gap-2">
            {profile.trends.map((trend) => (
              <Badge key={trend} variant="outline">
                {trend}
              </Badge>
            ))}
          </div>
        </ProfileCard>
      )}
    </div>
  )
}
