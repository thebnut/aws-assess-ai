# AWS Migration Discovery Web App

A simplified AI-driven web application for conducting AWS migration assessments through conversational Q&A.

## Features

- **Excel Template Upload**: Consultants upload assessment questionnaires in Excel format
- **Project Context**: Capture client name, project name, and overview for personalized AI interactions
- **Smart Q&A**: AI assistant asks questions intelligently based on project context
- **Voice Interaction**: Full voice support with speech-to-text and text-to-speech capabilities
- **Progress Tracking**: Real-time progress bar showing completion percentage
- **Export Results**: Download completed assessment with all answers in Excel format

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the application**:
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to the upload page

## Usage Flow

1. **Upload Assessment**:
   - Fill in client name, project name, and project overview
   - Upload Excel questionnaire file (see `data/Example-questionairre.xlsx`)
   - Click "Create Assessment"

2. **Share Link**:
   - Copy the generated link
   - Share with client SMEs who will answer questions

3. **Answer Questions**:
   - AI asks questions one by one
   - Use voice or text input
   - Questions are prioritized (mandatory first)
   - AI validates answers based on sufficiency rules
   - Skip non-applicable questions

4. **Export Results**:
   - Click "Export" button anytime
   - Downloads Excel with all answers filled

## Voice Features

- Click the microphone button to enable voice mode
- AI automatically speaks questions
- After AI finishes speaking, it listens for your response
- Voice commands supported: "skip question", "I don't know", "not applicable"
- Visual feedback shows listening, processing, and speaking states

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── sessions/        # Session management
│   │   ├── chat/           # AI chat endpoints
│   │   └── export/         # Excel export
│   ├── upload/             # Upload page
│   └── session/[id]/       # Chat interface
├── hooks/
│   └── useVoiceInteraction.ts  # Voice interaction hook
├── lib/
│   ├── excel.ts           # Excel parsing/generation
│   ├── sessions.ts        # Session management
│   ├── ai-assistant.ts    # AI logic
│   └── voice.ts           # Voice utilities
└── types/                 # TypeScript definitions
```

## Technical Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **AI**: OpenAI GPT-3.5 Turbo
- **Voice**: Web Speech API (Speech Recognition & Synthesis)
- **Storage**: Local file system (sessions stored in `data/sessions/`)
- **Excel**: xlsx package for parsing/generating Excel files

## Development

- Run type checking: `npm run type-check`
- Run linting: `npm run lint`
- Build for production: `npm run build`

## Deployment (Render.com)

1. Fork or connect this repository to your GitHub account
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `OPENAI_API_KEY`: Your OpenAI API key (required)
     - `NODE_ENV`: `production`
5. Deploy!

**Note**: In the demo deployment, sessions are not persisted between restarts. For production use, consider adding a database for session storage.
