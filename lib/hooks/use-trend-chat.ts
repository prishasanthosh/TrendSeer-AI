"use client"

import { useState, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"

export function useTrendChat() {
  // Get or create a user ID
  const [userId, setUserId] = useState<string>("")
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

  // Use the AI SDK's useChat hook with our user ID
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, reload, stop, setMessages } =
    useChat({
      api: "/api/chat",
      body: {
        userId,
      },
      streamProtocol: "text", // Use text protocol to avoid parsing issues
      onResponse: (response) => {
        // Check if the response is ok
        if (!response.ok) {
          console.error("Error response from chat API:", response.status, response.statusText)
          // Try to get more details from the response
          response
            .json()
            .then((data) => {
              console.error("Error details:", data)
              toast({
                title: "Error",
                description: data.error || "Failed to get response from TrendSeer AI",
                variant: "destructive",
              })
            })
            .catch((err) => {
              console.error("Failed to parse error response:", err)
            })
        } else {
          console.log("Response received:", response.status)
        }
      },
      onFinish: (message) => {
        // You can add custom logic here when a message is finished
        console.log("Message finished")
      },
      onError: (err) => {
        console.error("Chat error:", err)
        toast({
          title: "Error",
          description: "Failed to communicate with TrendSeer AI. Please try again.",
          variant: "destructive",
        })
      },
    })

  // Function to clear chat but preserve memory
  const clearChat = useCallback(() => {
    setMessages([])
  }, [setMessages])

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
