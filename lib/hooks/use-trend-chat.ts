"use client"

import { useState, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase-browser" // ✅ Using your browser client

export function useTrendChat() {
  const [userId, setUserId] = useState<string>("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem("trendseer_user_id")
      if (storedUserId) {
        setUserId(storedUserId)
      } else {
        const newUserId = uuidv4()
        localStorage.setItem("trendseer_user_id", newUserId)
        setUserId(newUserId)
      }
    } catch (error) {
      const fallbackUserId = uuidv4()
      setUserId(fallbackUserId)
    }
  }, [])

  // ✅ Get Supabase session using auth-helpers
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("Supabase session error:", error.message)
      } else if (session?.access_token) {
        setAccessToken(session.access_token)
        console.log("Access token set ✅")
      }
    }

    getSession()
  }, [])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    reload,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: {
      userId,
      accessToken, // ✅ Passed to the backend
    },
    streamProtocol: "text",
    onResponse: (res) => {
      if (!res.ok) {
        toast({
          title: "Chat Error",
          description: `TrendSeer AI failed with status ${res.status}`,
          variant: "destructive",
        })
      }
    },
    onError: (err) => {
      console.error("Chat error:", err)
      toast({
        title: "Error",
        description: "TrendSeer AI is not responding. Try again later.",
        variant: "destructive",
      })
    },
  })

  const saveCurrentChat = useCallback(async () => {
    if (messages.length > 0 && userId) {
      console.log("Chat save logic can go here.")
    }
  }, [messages, userId])

  const clearChat = useCallback(() => {
    saveCurrentChat()
    setMessages([])
  }, [saveCurrentChat, setMessages])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    reload,
    stop,
    clearChat,
    userId,
  }
}
