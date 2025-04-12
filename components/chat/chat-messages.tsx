import type { Message } from "ai"
import { ChatMessage } from "@/components/chat/chat-message"
import { WelcomeMessage } from "@/components/chat/welcome-message"

interface ChatMessagesProps {
  messages: Message[]
  isLoading: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  // If there are no messages, show the welcome message
  if (messages.length === 0) {
    return <WelcomeMessage />
  }

  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (
        <ChatMessage
          message={{
            id: "loading",
            role: "assistant",
            content: "Thinking...",
          }}
          isLoading
        />
      )}
    </div>
  )
}
