# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an intelligent quiz system called "墨隐侠踪" (Ink Hidden Swordsman) - a modern AI-powered quiz application with traditional Chinese ink-wash aesthetic. The system allows users to upload documents (txt, csv, md, docx, pdf, xlsx) which are parsed by AI to generate interactive quiz content.

## Architecture

### Monorepo Structure
- **Root**: Workspace manager with concurrently commands for orchestrating frontend/backend
- **study-app/**: Next.js 15 frontend with React 19, TypeScript, Tailwind CSS, Radix UI
- **backend/**: Express.js API server with TypeScript, Prisma ORM, AI integration
- **Docker**: Multi-service containerization with nginx, redis, mongodb

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, Prisma Client
- **Backend**: Express.js, TypeScript, Prisma ORM, Google Gemini AI, BullMQ job queue
- **Database**: PostgreSQL (frontend), SQLite (backend development)  
- **Infrastructure**: Docker Compose, nginx, Redis, MongoDB

## Development Commands

### Root Level (Main Commands)
```bash
# Install all dependencies across workspaces
npm run install:all

# Development (runs both frontend and backend)
npm run dev
npm run dev:frontend  # Frontend only at :3000
npm run dev:backend   # Backend only at :3001

# Production build
npm run build
npm run start

# Testing
npm run test
npm run test:frontend
npm run test:backend

# Linting
npm run lint
npm run lint:frontend
npm run lint:backend

# Docker
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs

# Cleanup
npm run clean
```

### Frontend (study-app/)
```bash
# Development
npm run dev          # Next.js dev server on :3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check

# Database
npm run db:migrate   # Prisma migrations
npm run db:push      # Push schema to DB
npm run db:studio    # Prisma Studio
```

### Backend (backend/)
```bash
# Development - Multiple server versions available
npm run dev          # Main server (src/index.ts)
npm run dev:v1       # Legacy server (src/server.ts)  
npm run dev:v2       # V2 server (src/app-v2.ts)

# Worker processes
npm run worker       # Background job worker

# Production
npm run build        # TypeScript compilation + Prisma generate
npm run start        # Production server
npm run start:v1     # Legacy production
npm run start:v2     # V2 production

# Database
npm run db:migrate   # Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Prisma Studio
npm run db:reset     # Reset database

# Configuration
npm run config:setup    # Setup configuration
npm run config:validate # Validate configuration
npm run config:generate # Generate .env template

# Testing
npm run test            # Jest tests
npm run test:watch      # Jest watch mode
npm run test:api        # API-specific tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run type-check      # TypeScript check
```

## Code Architecture

### Frontend Architecture
- **App Router**: Next.js 15 app directory structure
- **Components**: Modular React components with TypeScript
- **UI Library**: Radix UI primitives with custom theming
- **Styling**: Tailwind CSS with ink-wash design system
- **State**: React hooks and context for state management
- **API**: Next.js API routes + backend integration via lib/api.ts

### Backend Architecture
- **Layered Architecture**: Controllers → Services → Models pattern
- **API Versioning**: v1 (legacy) and v2 (current) endpoints
- **AI Integration**: Google Gemini for document parsing and quiz generation
- **Job Queue**: BullMQ with Redis for background processing
- **Authentication**: JWT with bcrypt password hashing
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)

### Key Service Files
- **backend/src/services/enhancedFileParser.ts**: Multi-format document parsing
- **backend/src/services/gemini.ts**: AI service integration
- **backend/src/workers/quizWorker.ts**: Background job processing
- **study-app/lib/api.ts**: Frontend API client with proper error handling
- **study-app/components/smart-parsing-page.tsx**: Main quiz generation interface

### Database Schema
Core models: User, Quiz, Job
- Users create Quizzes through async Jobs
- Jobs track parse/generation progress with status updates
- Quizzes store generated HTML content and metadata

## Development Workflow

### Adding New Features
1. Start with the API layer in backend/src/routes/
2. Implement business logic in backend/src/services/
3. Add frontend components in study-app/components/
4. Update API client in study-app/lib/api.ts
5. Test with Jest (backend) and component tests (frontend)

### File Upload Processing
The system handles file uploads through a robust pipeline:
1. Frontend uploads via smart-parsing-page component
2. Backend parses with enhancedFileParser service
3. AI processes content with Gemini service
4. Jobs track progress asynchronously
5. Generated quizzes stored as HTML in database

### Running Tests
Always run tests before deploying:
```bash
# Backend
cd backend && npm run test
cd backend && npm run type-check

# Frontend  
cd study-app && npm run type-check
```

### Docker Development
Use Docker Compose for full-stack development:
```bash
npm run docker:up    # Starts all services
npm run docker:logs  # View logs
npm run docker:down  # Stop services
```

## Environment Configuration

### Required Environment Variables
Backend requires AI_API_KEY for Gemini integration. See .env.example for full configuration template including database, Redis, CORS, and security settings.

### Database Setup
- Development: SQLite with Prisma migrations
- Production: PostgreSQL with connection pooling
- Both environments use identical Prisma schema

## Important Notes

- The system supports Chinese and English content
- AI parsing works with txt, csv, md, docx, pdf, xlsx formats
- Background job processing ensures responsive UI during file parsing
- Frontend uses ink-wash design theme with traditional Chinese aesthetics
- Authentication is JWT-based with secure password hashing
- Rate limiting and CORS protection are configured for production

## Troubleshooting

### Common Issues
- **AI API failures**: Check AI_API_KEY configuration and network connectivity
- **Database connection errors**: Verify DATABASE_URL and run migrations
- **File upload failures**: Check file size limits and supported formats
- **Build errors**: Run `npm run type-check` to identify TypeScript issues