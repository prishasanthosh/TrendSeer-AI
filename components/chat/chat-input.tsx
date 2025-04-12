"use client"

import type React from "react"

import type { FormEvent } from "react"
import { SendHorizontal, StopCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  onStop: () => void
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading, onStop }: ChatInputProps) {
  // Handle form submission with Enter key (but allow Shift+Enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about trends, content strategies, or industry insights..."
        className="min-h-[60px] resize-none pr-14"
        disabled={isLoading}
      />
      <div className="absolute bottom-2 right-2">
        {isLoading ? (
          <Button type="button" size="icon" variant="ghost" onClick={onStop}>
            <StopCircle className="h-5 w-5" />
            <span className="sr-only">Stop generating</span>
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <SendHorizontal className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </div>
    </form>
  )
}
