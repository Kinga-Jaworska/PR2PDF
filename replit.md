# PR Insight - AI-Powered Pull Request Analysis Platform

## Overview

PR Insight is a comprehensive pull request analysis platform that automates the generation of detailed reports for different stakeholders. The system integrates with GitHub repositories to sync pull requests and uses AI (Google Gemini) to generate tailored reports for project managers, QA teams, and clients. It features a modern React frontend with shadcn/ui components and a robust Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Library**: shadcn/ui components built on Radix UI primitives with tabbed interfaces
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Report Management**: Tabbed interface for filtering different report types

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with proper error handling and request logging
- **File Structure**: Modular service-based architecture separating concerns

### Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Core Tables**:
  - `repositories`: GitHub repository configurations and tokens
  - `pull_requests`: Synchronized PR data with metadata
  - `reports`: AI-generated reports for different audiences
  - `insights`: Analysis insights categorized by type and severity

### Authentication & Security
- **GitHub Integration**: Personal access tokens for repository access
- **Token Validation**: Server-side validation of GitHub tokens and repository permissions
- **Environment Variables**: Secure configuration management for API keys

### AI Integration
- **Provider**: Google Gemini AI for content generation
- **Report Types**: Customized reports for PM, QA, and client audiences, plus repository-level MVP summaries
- **Content Structure**: Structured report generation with sections, recommendations, and test scenarios
- **MVP Reports**: Dedicated AI-generated summaries for client presentations and project status updates

### Development Environment
- **Build System**: Vite for frontend bundling and esbuild for backend compilation
- **Development Tools**: Hot module replacement, error overlays, and development banners
- **Type Safety**: Strict TypeScript configuration across frontend, backend, and shared code

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting for data persistence
- **GitHub API**: Repository and pull request data synchronization
- **Google Gemini API**: AI-powered content generation for reports

### UI Components
- **Radix UI**: Comprehensive primitive components for accessibility
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens

### Development Tools
- **Replit Integration**: Development environment plugins for cartographer and dev banner
- **TanStack Query**: Server state management and caching
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

### Database & ORM
- **Drizzle ORM**: Type-safe database operations and query building
- **pg**: PostgreSQL client for Node.js
- **Neon Serverless**: WebSocket-based database connection for serverless environments