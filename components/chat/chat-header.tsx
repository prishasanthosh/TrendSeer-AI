"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ChatHeaderProps {
  onClearChat: () => void
  onNewChat: () => void
}

export function ChatHeader({ onClearChat, onNewChat }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/40 p-4">
      <div>
        <h2 className="text-lg font-semibold">Chat with TrendSeer AI</h2>
        <p className="text-sm text-muted-foreground">Ask about trends, content strategies, and industry insights</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onNewChat}>
          New Chat
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-5 w-5" />
              <span className="sr-only">Clear chat</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all messages from the current conversation. Your profile and learned preferences will
                be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearChat}>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
