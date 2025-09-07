# DevCenter AI Web Generator

## Overview

DevCenter is an AI-powered web generator that creates complete HTML pages based on user prompts. It features a chat-based interface where users can describe what they want, and the AI generates fully functional web pages with modern styling using Tailwind CSS. The application provides real-time preview capabilities and allows users to download the generated code.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

The frontend follows a component-based architecture with:
- Chat interface components for message display and input
- Modal system for code preview
- Sidebar for chat history management
- Responsive design with mobile-first approach

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API design
- **Data Storage**: In-memory storage with interface abstraction for future database integration
- **Development**: Hot module replacement via Vite integration

The backend implements a clean separation of concerns:
- Route handlers in `/server/routes.ts`
- Storage abstraction layer in `/server/storage.ts`
- Vite integration for development workflow

### Database Schema
The application defines schemas using Drizzle ORM with PostgreSQL dialect:

**Chats Table**:
- `id`: UUID primary key
- `name`: Text field for chat names
- `createdAt`: Timestamp for creation
- `updatedAt`: Timestamp for last modification

**Messages Table**:
- `id`: UUID primary key
- `chatId`: Foreign key reference to chats
- `type`: Text field ('user' or 'ai')
- `content`: Text field for message content
- `generatedCode`: Optional text field for AI-generated HTML code
- `timestamp`: Timestamp for message creation

### AI Integration
- **Provider**: Google Generative AI (Gemini 1.5 Flash)
- **Functionality**: Converts natural language prompts into complete HTML pages
- **Output**: Full HTML documents with embedded CSS and JavaScript
- **Styling**: Automatically includes Tailwind CSS via CDN

### External Dependencies

**Core Dependencies**:
- `@google/genai`: Google Generative AI integration for webpage generation
- `@neondatabase/serverless`: Database connectivity (configured for PostgreSQL)
- `drizzle-orm` & `drizzle-kit`: Database ORM and migration tools
- `express`: Web server framework
- `react` & `react-dom`: Frontend framework
- `@tanstack/react-query`: Server state management

**UI Components**:
- `@radix-ui/*`: Comprehensive set of unstyled, accessible UI primitives
- `class-variance-authority`: Utility for component variant management
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library

**Development Tools**:
- `vite`: Build tool and development server
- `typescript`: Type checking and compilation
- `tsx`: TypeScript execution for Node.js
- `@replit/vite-plugin-runtime-error-modal`: Development error handling
- `@replit/vite-plugin-cartographer`: Development tooling integration

**Database & Storage**:
- PostgreSQL database (configured via `DATABASE_URL` environment variable)
- Drizzle migrations system for schema management
- In-memory fallback storage for development