# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShortcutGenius is a web application for creating, analyzing, and optimizing iOS Shortcuts using AI. It features a React frontend with Monaco editor, a Node.js/Express backend, and integrates with both OpenAI (GPT-4) and Anthropic (Claude 3.5 Sonnet) APIs.

## Development Commands

```bash
# Start development server (port 5000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Update database schema
npm run db:push
```

## Architecture

### Frontend (client/)
- **React + TypeScript** application with Vite
- **UI Components**: Built with Radix UI primitives and styled with Tailwind CSS
- **Key Components**:
  - `EditorPane`: Monaco editor for JSON shortcut editing
  - `PreviewPane`: Visual preview of shortcut actions
  - `AnalysisPane`: Displays AI-powered analysis results
  - `Toolbar`: Model selection and import/export functionality

### Backend (server/)
- **Express server** serving both API and static files
- **API Endpoint**: `/api/process` - Handles AI generation and analysis
- **AI Integration**: 
  - OpenAI GPT-4o for shortcut generation/analysis
  - Anthropic Claude 3.5 Sonnet for advanced analysis
- **Environment Variables Required**:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`

### Shortcut System (client/src/lib/)
- **shortcuts.ts**: Core shortcut types and validation
- **shortcut-analyzer.ts**: Local analysis engine for patterns and optimization
- **ai.ts**: AI processing interface
- **Supported Actions**: notification, text, url, wait, speak, email, sms, weather, map, music, reminder, note, photo, video, clipboard, variable, conditional, repeat, exit

## Key Implementation Details

1. **JSON Validation**: Both AI responses and user input are validated for proper shortcut structure
2. **Error Handling**: Comprehensive error handling for API failures and malformed responses
3. **Response Cleaning**: AI responses are cleaned to extract valid JSON from markdown blocks
4. **Dual Analysis**: Combines AI analysis with local pattern detection

## Working with AI Models

When modifying AI integration:
- System prompts are defined in `server/routes.ts:14-51`
- Response parsing handles both text blocks and JSON extraction
- Both models are instructed to return specific JSON structures
- Local analysis supplements AI analysis for comprehensive insights

## Database

- Uses Drizzle ORM with PostgreSQL
- Schema defined in `db/schema.ts`
- Configuration in `drizzle.config.ts`