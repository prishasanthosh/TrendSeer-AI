export class SerperApiTool {
  private apiKey: string
  private baseUrl = "https://google.serper.dev/search"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(query: string, industries: string[] = []) {
    try {
      if (!this.apiKey) {
        console.error("Serper API key is missing")
        return {
          error: "API key is missing",
          results: [],
        }
      }

      // Enhance query with industry context if available
      let searchQuery = query
      if (industries && industries.length > 0) {
        // Add industry context to make search more relevant
        searchQuery = `${query} ${industries[0]}`
      }

      console.log(`Searching with Serper for query: "${searchQuery}"`)

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: searchQuery,
          gl: "us",
          hl: "en",
          num: 10,
        }),
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Serper API error: ${response.status}`, errorText)
        throw new Error(`Serper API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return this.processSearchResults(data)
    } catch (error) {
      console.error("Error searching with Serper:", error)
      return {
        error: `Failed to fetch search data: ${error instanceof Error ? error.message : String(error)}`,
        results: [],
      }
    }
  }

  private processSearchResults(data: any) {
    if (!data || !data.organic || data.organic.length === 0) {
      return {
        summary: "No relevant search results found.",
        results: [],
      }
    }

    // Extract key information from search results
    const processedResults = data.organic.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      position: result.position,
      date: result.date || "N/A",
    }))

    // Extract trending topics from search results
    const trendingTopics = this.extractTrendingTopics(processedResults)

    return {
      summary: `Found ${processedResults.length} relevant search results with ${trendingTopics.length} potential trending topics.`,
      results: processedResults,
      trendingTopics: trendingTopics,
      relatedSearches: data.relatedSearches || [],
    }
  }

  private extractTrendingTopics(results: any[]) {
    // This is a simplified implementation
    // In a real application, you might use more sophisticated NLP techniques
    const topics = new Set<string>()
    const commonWords = ["and", "the", "for", "with", "that", "this", "what", "how", "why"]

    results.forEach((result) => {
      // Extract potential topics from title
      const titleWords = result.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(" ")
        .filter((word: string) => word.length > 4 && !commonWords.includes(word))

      titleWords.forEach((word: string) => topics.add(word))
    })

    return Array.from(topics).slice(0, 10) // Return top 10 potential topics
  }
}
