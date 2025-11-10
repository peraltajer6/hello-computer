# Real-time Chat Application

## Overview

This is a real-time messaging application built with React, Express, and WebSockets. Users can sign in with just a username and immediately start chatting with others. The application features a clean, modern interface following Material Design principles with real-time message delivery.

**Core Features:**
- Simple username-based authentication (no passwords required)
- Real-time bidirectional messaging via WebSockets
- User search and conversation management
- Persistent sessions
- Responsive design with mobile support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite as the build tool

**UI Component System:** 
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with a custom design system
- "New York" style variant for shadcn components
- Material Design principles for messaging interfaces

**State Management:**
- TanStack Query (React Query) for server state management
- Local React state for UI interactions
- WebSocket connection managed via useRef hook

**Routing:**
- Wouter for lightweight client-side routing
- Three main routes: login (`/`), chat (`/chat`), and 404 page

**Key Design Patterns:**
- Component composition with separation of concerns (sidebar, chat area, empty state)
- Custom hooks for mobile detection and toast notifications
- Theme provider for light/dark mode support
- Query client with custom fetch configuration for API requests

### Backend Architecture

**Server Framework:** Express.js with TypeScript

**Session Management:**
- Express-session with in-memory store (MemoryStore)
- Session-based authentication (no passwords)
- 7-day session expiration
- HTTP-only cookies for security

**Real-time Communication:**
- WebSocket server (ws library) for bidirectional messaging
- Protocol upgrades on `/ws` endpoint
- Message broadcasting to connected clients
- Automatic reconnection handling on client side

**API Structure:**
- RESTful endpoints under `/api` namespace
- Authentication middleware for protected routes
- Endpoints:
  - `POST /api/auth/login` - Create/retrieve user by username
  - `POST /api/auth/logout` - Destroy session
  - `GET /api/auth/me` - Get current authenticated user
  - `GET /api/conversations` - List user's conversations
  - `GET /api/messages?userId={id}` - Fetch messages between users
  - `POST /api/messages` - Send new message
  - `GET /api/users/search?q={query}` - Search for users

**Development vs Production:**
- Vite dev server in middleware mode for development
- Static file serving in production
- Hot module replacement (HMR) in development
- Replit-specific plugins for enhanced development experience

### Data Storage

**Current Implementation:** In-memory storage (`MemStorage` class)

**Storage Interface (IStorage):**
- User operations: get, search, create
- Message operations: create, fetch between users
- Conversation operations: get conversations for user
- Designed for easy swapping with persistent storage (e.g., PostgreSQL with Drizzle ORM)

**Database Schema (Prepared for PostgreSQL):**
- `users` table: id (UUID), username (unique)
- `messages` table: id (UUID), senderId, recipientId, content, createdAt
- Foreign key constraints from messages to users
- Drizzle ORM configured and ready (schema defined, config present)

**Migration Strategy:**
- Drizzle Kit configured for PostgreSQL
- Schema defined in `shared/schema.ts`
- Ready to run `npm run db:push` when database is provisioned
- Environment variable `DATABASE_URL` required for database connection

### External Dependencies

**UI & Styling:**
- Radix UI - Accessible component primitives (@radix-ui/*)
- Tailwind CSS - Utility-first CSS framework
- class-variance-authority - Type-safe variant management
- Google Fonts (Inter) - Typography
- Lucide React - Icon library

**Data Management:**
- TanStack Query - Server state management and caching
- React Hook Form - Form state management
- Zod - Schema validation
- drizzle-zod - Zod schema generation from Drizzle schemas

**Backend Services:**
- ws - WebSocket server implementation
- express-session - Session management
- memorystore - In-memory session store (temporary, suitable for development)

**Database (Configured but Optional):**
- @neondatabase/serverless - Neon PostgreSQL driver
- Drizzle ORM - TypeScript ORM for SQL databases
- drizzle-kit - Database migration tool
- Note: Currently using in-memory storage; PostgreSQL can be added by setting DATABASE_URL

**Development Tools:**
- Vite - Build tool and dev server
- TypeScript - Type safety
- esbuild - JavaScript bundler for production build
- Replit plugins - Enhanced development experience on Replit platform

**Utilities:**
- date-fns - Date formatting and manipulation
- nanoid - Unique ID generation
- wouter - Lightweight routing library