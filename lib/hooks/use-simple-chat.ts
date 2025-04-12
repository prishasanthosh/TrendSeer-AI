"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

export function useSimpleChat() {
  // Get or create a user ID
  const [userId, setUserId] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Try to get the user ID from localStorage
    try {
      const storedUserId = localStorage.getItem("trendseer_user_id")

      if (storedUserId) {
        console.log("Using existing user ID:", storedUserId)
        setUserId(storedUserId)
      } else {
        // Create a new user ID if none exists
        const newUserId = uuidv4()
        console.log("Created new user ID:", newUserId)
        localStorage.setItem("trendseer_user_id", newUserId)
        setUserId(newUserId)
      }
    } catch (error) {
      // Handle localStorage errors (e.g., in incognito mode)
      console.error("Error accessing localStorage:", error)
      const fallbackUserId = uuidv4()
      console.log("Using fallback user ID:", fallbackUserId)
      setUserId(fallbackUserId)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() || !userId) return

      // Add user message to the chat
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/chat/simple", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            userId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Error: ${response.status}`)
        }

        const data = await response.json()

        // Add assistant message to the chat
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: data.content,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        console.error("Error in chat submission:", err)
        setError(err instanceof Error ? err : new Error("An unknown error occurred"))
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to communicate with TrendSeer AI",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [input, messages, userId, toast],
  )

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  const stop = useCallback(() => {
    // This is a no-op in the simple chat implementation
    // as we don't have streaming to stop
    console.log("Stop requested, but not applicable in simple chat")
  }, [])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearChat,
    stop,
    userId,
  }
}
