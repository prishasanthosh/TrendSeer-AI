# TrendSeer AI Backend

This is the backend implementation for TrendSeer AI, an AI chatbot agent that analyzes current online trends and provides insights on their relevance and potential longevity.

## Features

- **AI Agent Functionality**: Built with Vercel AI SDK and Gemini
- **Persistent Memory**: Uses Supabase (pgvector) for vector storage across chat sessions
- **Real-time Data Retrieval**: Integrates with News API and Serper API
- **Context-Aware Responses**: Recalls previous interactions and user preferences

## Tech Stack

- **LLM Provider**: Google Gemini
- **Embeddings**: Gemini Embeddings
- **Vector Database**: Supabase (pgvector)
- **Development Stack**: Next.js with Vercel AI SDK
- **UI**: Next.js (frontend implementation required)
- **Deployment**: Vercel (recommended)

## Setup Instructions

### Prerequisites

1. Node.js 18+ and npm/yarn
2. Supabase account
3. Google AI Studio account (for Gemini API key)
4. News API key
5. Serper API key

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
GEMINI_API_KEY=your_gemini_api_key
NEWS_API_KEY=your_news_api_key
SERPER_API_KEY=your_serper_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
\`\`\`

### Database Setup

1. Create a new Supabase project
2. Enable the pgvector extension in your Supabase project
3. Run the SQL commands from `schema.sql` in the Supabase SQL editor

### Installation

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev
\`\`\`

## API Endpoints

- **POST /api/chat**: Main chat endpoint that handles user messages
- **GET /api/user/profile**: Get user profile information
- **POST /api/trends/analyze**: Analyze a specific trend topic

## Implementation Details

### Memory Management

The system uses a vector database to store and retrieve user context across sessions. Each interaction is summarized and stored as embeddings, allowing the system to recall relevant information even after the chat has been cleared.

### Real-time Data Retrieval

Two main tools are implemented for real-time data retrieval:
1. **News API Tool**: Fetches recent news articles related to the user's query
2. **Serper API Tool**: Searches for current trends and information across the web

### Context-Aware Responses

The system combines:
- Historical user context (industries, audience, goals, previous trends)
- Real-time data from APIs
- The current conversation

This creates a comprehensive prompt for the AI model to generate relevant and personalized responses.

## Next Steps

1. Implement the frontend UI using Next.js
2. Add user authentication (optional)
3. Implement additional data sources (e.g., social media APIs)
4. Deploy to Vercel
