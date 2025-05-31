# AI Voice-to-Voice Chat Application

This is a Next.js application that provides voice-to-voice chat with AI using Gemini models through the OpenAI SDK.

## Features

- 🎤 Voice recording and input
- 🤖 AI responses using Gemini 2.5 Pro models
- 🔊 Text-to-speech voice responses
- 💾 Conversation history stored in database
- 🎨 Beautiful, modern UI with Tailwind CSS

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or any Prisma-supported database)
- Google AI API key for Gemini models

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory with:

   ```
   # Database URL for Prisma
   DATABASE_URL="your-postgresql-database-url"

   # Google AI API Key for Gemini models
   OPENAI_API_KEY="your-google-ai-api-key"

   # Base URL for OpenAI API (to use Gemini)
   OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai"
   ```

3. **Set up the database:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Click the microphone button to start recording
2. Speak your message
3. Click the stop button when finished
4. The AI will process your audio and respond with both text and voice
5. Continue the conversation or start a new one

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **AI Models:**
  - Gemini 2.5 Pro Preview (05-06) for conversation
  - Gemini 2.5 Pro Preview TTS for text-to-speech
- **Audio:** Web Audio API for recording

## Important Notes

- Microphone permissions are required for voice recording
- HTTPS is required in production for microphone access
- Audio is processed in WebM format and converted to base64 for the AI
- Responses are returned as MP3 audio
