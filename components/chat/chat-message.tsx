import type { Message } from "ai"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
}

export function ChatMessage({ message, isLoading = false }: ChatMessageProps) {
  return (
    <div className={cn("flex w-full items-start gap-4 p-4", message.role === "user" ? "justify-end" : "justify-start")}>
      {message.role === "assistant" && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card className={cn("max-w-[80%]", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-current"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]"></div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
      {message.role === "user" && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
