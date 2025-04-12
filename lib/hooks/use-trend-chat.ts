"use client"

import { useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { v4 as uuidv4 } from "uuid"

export function useTrendChat() {
  // Get or create a user ID
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    // Try to get the user ID from localStorage
    const storedUserId = localStorage.getItem("trendseer_user_id")

    if (storedUserId) {
      setUserId(storedUserId)
    } else {
      // Create a new user ID if none exists
      const newUserId = uuidv4()
      localStorage.setItem("trendseer_user_id", newUserId)
      setUserId(newUserId)
    }
  }, [])

  // Use the AI SDK's useChat hook with our user ID
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, reload, stop, setMessages } =
    useChat({
      api: "/api/chat",
      body: {
        userId,
      },
      onResponse: (response) => {
        // You can add custom logic here when a response is received
        console.log("Response received:", response)
      },
      onFinish: (message) => {
        // You can add custom logic here when a message is finished
        console.log("Message finished:", message)
      },
      onError: (error) => {
        console.error("Chat error:", error)
      },
    })

  // Function to clear chat but preserve memory
  const clearChat = () => {
    setMessages([])
  }

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
