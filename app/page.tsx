"use client"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layouts/main-layout"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAuth } from "@/lib/auth-context"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Let the middleware handle redirects instead of doing it here
  // This prevents potential redirect loops

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render the main content if we have a user
  // The middleware will handle redirecting if there's no user
  return (
    <MainLayout>
      <ChatInterface />
    </MainLayout>
  )
}
