"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useTrendChat } from "@/lib/hooks/use-trend-chat"
import { useSimpleChat } from "@/lib/hooks/use-simple-chat"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import { Card } from "@/components/ui/card"
import { SetupInstructions } from "@/components/setup-instructions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatInterface() {
  const [setupRequired, setSetupRequired] = useState(false)
  const [useSimpleMode, setUseSimpleMode] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [checkingDatabase, setCheckingDatabase] = useState(true)
  const [creatingTables, setCreatingTables] = useState(false)

  // Check URL for simple mode parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get("simple") === "true") {
        setUseSimpleMode(true)
        setChatError("Using simple chat mode for better compatibility.")
      }
    }
  }, [])

  // Try to use the streaming chat first
  const streamingChat = useTrendChat()

  // Use simple chat as fallback
  const simpleChat = useSimpleChat()

  // Determine which chat implementation to use
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, clearChat, stop, userId } = useSimpleMode
    ? simpleChat
    : streamingChat

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Switch to simple mode if streaming mode has an error
  useEffect(() => {
    if (streamingChat.error && !useSimpleMode) {
      console.log("Switching to simple chat mode due to error:", streamingChat.error)
      setChatError(
        `Streaming chat encountered an error: ${streamingChat.error.message || "Unknown error"}. Using simple chat mode instead.`,
      )
      setUseSimpleMode(true)
    }
  }, [streamingChat.error, useSimpleMode])

  // Check if database setup is required
  useEffect(() => {
    if (!userId) return

    async function checkDatabaseSetup() {
      try {
        setCheckingDatabase(true)
        const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`)
        const data = await response.json()

        if (data.setupRequired || data.databaseStatus === "not_setup") {
          setSetupRequired(true)
        }
      } catch (error) {
        console.error("Error checking database setup:", error)
      } finally {
        setCheckingDatabase(false)
      }
    }

    checkDatabaseSetup()
  }, [userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSwitchMode = () => {
    setUseSimpleMode(!useSimpleMode)
    setChatError(
      useSimpleMode ? "Switched to streaming chat mode." : "Switched to simple chat mode for better compatibility.",
    )
  }

  const handleNewChat = useCallback(() => {
    // Save current chat to history (if there are messages)
    if (messages.length > 0) {
      // This will happen automatically through the existing mechanisms
      console.log("Saving current chat before starting new one")
    }

    // Clear the current chat
    clearChat()

    // Refresh chat history in sidebar (this will happen on next render)
    console.log("Starting new chat")
  }, [messages.length, clearChat])

  if (checkingDatabase) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader onClearChat={clearChat} onNewChat={handleNewChat} />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Database className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Checking database setup...</h2>
            <p className="mt-2 text-muted-foreground">This will only take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  if (setupRequired) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader onClearChat={clearChat} onNewChat={handleNewChat} />
        <div className="flex-1 overflow-y-auto p-4">
          <SetupInstructions />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader onClearChat={clearChat} onNewChat={handleNewChat} />
      <div className="flex-1 overflow-y-auto p-4">
        {chatError && (
          <Alert variant="default" className="mb-4 mx-auto max-w-3xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chat Mode: {useSimpleMode ? "Simple" : "Streaming"}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{chatError}</span>
              <Button variant="outline" size="sm" onClick={handleSwitchMode}>
                Switch to {useSimpleMode ? "Streaming" : "Simple"} Mode
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Card className="mx-auto max-w-3xl">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <div ref={messagesEndRef} />
        </Card>
      </div>
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  )
}
