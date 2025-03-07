# CLAUDE.md - Knowledge Base for Goalspace

## Application Overview

Goalspace is an AI-powered goal setting and achievement platform that helps users transform their aspirations into concrete results through:

1. **Intelligent Goal Analysis** - AI assistant "Faez" analyzes user goals and provides personalized guidance
2. **Specialized Learning Spaces** - Goals are broken down into focused spaces with dedicated AI mentors
3. **AI-Generated Content** - Custom learning modules, tasks, and resources tailored to each goal
4. **Progress Tracking** - Visual indicators and task management to monitor advancement

## Core Features

### Goal Setting and Analysis
- Users input their goals in natural language
- AI conducts an analysis process to understand context and requirements
- The system breaks down large goals into manageable learning spaces

### AI Mentorship
- Each space is assigned a specialized AI mentor with relevant expertise
- Mentors generate personalized learning content and provide guidance
- Users can chat with mentors to get answers and support

### Learning Content Management
- Structured modules with educational content
- Task management with to-do lists
- Knowledge base with documents and reference materials
- Markdown-based content with rich formatting

### Progress Tracking
- Visual progress indicators (bars, percentages)
- Task completion tracking
- Activity logging and time measurement

### Multimedia Learning
- Podcast feature for audio-based learning
- Rich text editing capabilities

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- React components with TypeScript
- Tailwind CSS with shadcn/ui components
- Zustand for state management

### Backend
- Supabase for database and authentication
- PostgreSQL database
- Row-Level Security for data protection
- AI integration with multiple providers (OpenAI, Anthropic)

## Core Database Entities

- **Users** - Account and profile information
- **Goals** - User objectives with metadata
- **Spaces** - Learning environments within goals
- **Modules** - Content modules within spaces
- **Tasks** - To-do items for progress tracking
- **Documents** - Knowledge base content
- **Chat Messages** - Conversations with AI mentors

## Common Development Tasks

### Environment Setup
- PATH should include: /usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
- npm run dev - Start development server
- npm run build - Build for production
- npm run lint - Run code linting

### Database Operations
- Supabase migrations in /supabase/migrations directory
- Database schema in /supabase/schema directory
- Type definitions in /lib/types directory

### Internationalization
- Uses next-intl for translations
- Locale files in /locales and /src/locales directories
- Supported locales: 'en', 'ms' (English and Malay)

### Development Flags
- Set `NEXT_PUBLIC_SKIP_API_CALL=true` in `.env.local` to use mock data instead of real API calls
- Mock data is located in `/lib/utils/mock-data.ts`
- This feature saves costs during development by avoiding unnecessary LLM API calls

## User Flow

1. User creates an account and logs in
2. User enters a goal they want to achieve
3. AI assistant analyzes the goal and asks clarifying questions
4. System generates specialized learning spaces with AI mentors
5. User works through modules, completes tasks, and tracks progress
6. User can chat with mentors for guidance at any time