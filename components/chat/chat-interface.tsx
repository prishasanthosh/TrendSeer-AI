"use client"

import { useEffect, useRef, useState } from "react"
import { useTrendChat } from "@/lib/hooks/use-trend-chat"
import { useSimpleChat } from "@/lib/hooks/use-simple-chat"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import { Card } from "@/components/ui/card"
import { SetupInstructions } from "@/components/setup-instructions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Database } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { MemoryManager } from "@/lib/memory-manager"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize memory manager
const memoryManager = new MemoryManager(supabase)

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
      setChatError("Streaming chat encountered an error. Using simple chat mode instead.")
      setUseSimpleMode(true)
    }
  }, [streamingChat.error, useSimpleMode])

  // Check if database setup is required and try to create tables if needed
  useEffect(() => {
    if (!userId) return

    async function checkAndSetupDatabase() {
      try {
        setCheckingDatabase(true)

        // Try to create tables if they don't exist
        setCreatingTables(true)
        const tablesCreated = await memoryManager.createTablesIfNotExist()
        setCreatingTables(false)

        if (!tablesCreated) {
          setSetupRequired(true)
        } else {
          setSetupRequired(false)
        }
      } catch (error) {
        console.error("Error checking/setting up database:", error)
        setSetupRequired(true)
      } finally {
        setCheckingDatabase(false)
      }
    }

    checkAndSetupDatabase()
  }, [userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (checkingDatabase) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader onClearChat={clearChat} />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Database className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <h2 className="mt-4 text-xl font-semibold">
              {creatingTables ? "Setting up database..." : "Checking database setup..."}
            </h2>
            <p className="mt-2 text-muted-foreground">This will only take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  if (setupRequired) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader onClearChat={clearChat} />
        <div className="flex-1 overflow-y-auto p-4">
          <SetupInstructions />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader onClearChat={clearChat} />
      <div className="flex-1 overflow-y-auto p-4">
        {chatError && (
          <Alert variant="default" className="mb-4 mx-auto max-w-3xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chat Mode Changed</AlertTitle>
            <AlertDescription>{chatError}</AlertDescription>
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
