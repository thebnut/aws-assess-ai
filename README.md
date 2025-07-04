# AWS Migration Discovery Web App

A simplified AI-driven web application for conducting AWS migration assessments through conversational Q&A.

## Features

- **Excel Template Upload**: Consultants upload assessment questionnaires in Excel format
- **Project Context**: Capture client name, project name, and overview for personalized AI interactions
- **Smart Q&A**: AI assistant asks questions intelligently based on project context
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
   - Questions are prioritized (mandatory first)
   - AI validates answers based on sufficiency rules
   - Skip non-applicable questions

4. **Export Results**:
   - Click "Export" button anytime
   - Downloads Excel with all answers filled

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
├── lib/
│   ├── excel.ts           # Excel parsing/generation
│   ├── sessions.ts        # Session management
│   └── ai-assistant.ts    # AI logic
└── types/                 # TypeScript definitions
```

## Technical Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **AI**: OpenAI GPT-3.5 Turbo
- **Storage**: Local file system (sessions stored in `data/sessions/`)
- **Excel**: xlsx package for parsing/generating Excel files

## Development

- Run type checking: `npm run type-check`
- Run linting: `npm run lint`
- Build for production: `npm run build`