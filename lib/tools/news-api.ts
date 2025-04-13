export class NewsApiTool {
  private apiKey: string
  private baseUrl = "https://newsapi.org/v2"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchNews(query: string, industries: string[] = []) {
    try {
      if (!this.apiKey) {
        console.error("News API key is missing")
        return {
          error: "API key is missing",
          articles: [],
        }
      }

      // Combine the user query with industry context
      let searchQuery = query
      if (industries && industries.length > 0) {
        searchQuery = `${query} ${industries.join(" OR ")}`
      }

      console.log(`Fetching news for query: "${searchQuery}"`)

      // Fetch news articles
      const response = await fetch(
        `${this.baseUrl}/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&language=en&pageSize=10`,
        {
          headers: {
            "X-Api-Key": this.apiKey,
          },
          cache: "no-store",
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`News API error: ${response.status}`, errorText)
        throw new Error(`News API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Process and format the results
      return this.processNewsResults(data.articles)
    } catch (error) {
      console.error("Error fetching news:", error)
      return {
        error: `Failed to fetch news data: ${error instanceof Error ? error.message : String(error)}`,
        articles: [],
      }
    }
  }

  private processNewsResults(articles: any[]) {
    if (!articles || articles.length === 0) {
      return {
        summary: "No relevant news articles found.",
        articles: [],
      }
    }

    // Extract key information from articles
    const processedArticles = articles.map((article) => ({
      title: article.title,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url,
      description: article.description,
    }))

    // Group articles by topic/theme
    const topics = this.groupArticlesByTopic(processedArticles)

    return {
      summary: `Found ${articles.length} relevant news articles across ${Object.keys(topics).length} topics.`,
      articles: processedArticles,
      topics: topics,
    }
  }

  private groupArticlesByTopic(articles: { title: string }[]) {
    // This is a simplified implementation
    // In a real application, you might use NLP or clustering algorithms
    const topics: Record<string, any[]> = {}

    articles.forEach((article) => {
      // Extract potential topic from title
      const words = article.title.toLowerCase().split(" ")
      const potentialTopics = words.filter(
        (word: string) => word.length > 5 && !["about", "these", "those", "their", "there"].includes(word),
      )

      if (potentialTopics.length > 0) {
        const mainTopic = potentialTopics[0]

        if (!topics[mainTopic]) {
          topics[mainTopic] = []
        }

        topics[mainTopic].push(article)
      }
    })

    return topics
  }
}
