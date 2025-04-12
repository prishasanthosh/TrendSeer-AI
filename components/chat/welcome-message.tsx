import { Bot } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Avatar className="mb-4 h-16 w-16">
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
          <Bot className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>
      <h2 className="mb-2 text-2xl font-bold">Welcome to TrendSeer AI</h2>
      <p className="mb-6 text-muted-foreground">Your AI assistant for trend analysis and content strategy insights</p>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Ask about current trends across social media, news outlets, and search engines
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Get insights on content formats, topics, and strategies for your target audience
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Industry Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Learn what recent industry reports are saying about your field</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thought Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Discover what thought leaders are saying about content effectiveness</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Try asking:</p>
        <ul className="mt-2 list-disc space-y-1 text-left">
          <li>What are the most discussed digital marketing topics in recent news articles?</li>
          <li>What are the latest industry reports saying about content strategies for B2B audiences?</li>
          <li>Are there any emerging trends in recent news that connect to the tech industry?</li>
        </ul>
      </div>
    </div>
  )
}
