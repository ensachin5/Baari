# Baari (बारी) — Shared Living Coordination Platform

Baari is a modern full-stack shared living coordination platform designed for flatmates, roommates, and hostel-mates to coordinate shared household responsibilities (Kaam), track & split expenses, and communicate in real time.

---

## Repository Structure

The monorepo contains three coordinated services:

- **`baari-backend/`**: Express (TypeScript), Better Auth, Drizzle ORM (Supabase PostgreSQL), Socket.io, Zod, Pino, Helmet, Rate Limiting.
- **`baari-web/`**: Next.js 16 (App Router, Turbopack, PWA with Serwist), TailwindCSS, TanStack Query, Zustand, Better Auth client.
- **`baari-app/`**: React Native (Expo SDK 55, Expo Router), Zustand, Socket.io client, React Native StyleSheet.

---

## Tech Stack & Database Architecture

- **Database**: Supabase PostgreSQL (managed via Drizzle ORM with connection pooling and SSL enabled).
- **Authentication**: Better Auth with native email & password authentication, session management, secure cookies/tokens, and optional Google OAuth.
- **Real-Time Communication**: Socket.io for live chat messages, task state transitions, and expense/settlement updates.
- **Validation & Security**: Zod schemas, auth middleware with token and cookie support, IDOR verification checks on all flat resources, and rate limiting.

---

## Quick Start

### 1. Unified Scripts (From Monorepo Root)

```bash
# Start backend dev server
npm run dev:backend

# Start Next.js web dev server
npm run dev:web

# Start Expo mobile app
npm run dev:app

# Build all projects
npm run build:all

# Typecheck and lint
npm run lint:web
npm run typecheck:backend
npm run typecheck:app
```

---

### 2. Backend Setup (`baari-backend`)

```bash
cd baari-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL, DIRECT_URL, and BETTER_AUTH_SECRET

# Run database migrations
npm run db:migrate

# Start development server (http://localhost:3000)
npm run dev
```

---

### 3. Web App Setup (`baari-web`)

```bash
cd baari-web

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3000

# Start Next.js development server (http://localhost:3001 or default)
npm run dev
```

---

### 4. Mobile App Setup (`baari-app`)

```bash
cd baari-app

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL (or machine IP for physical device)

# Start Expo dev server
npm run start
```

---

## Database Migrations (Supabase PostgreSQL)

Migrations are managed with Drizzle Kit in `baari-backend`:

```bash
# Generate new migrations from schema modifications
npm run db:generate

# Apply pending migrations to Supabase database
npm run db:migrate

# Push schema directly (development prototyping only)
npm run db:push

# Open Drizzle Studio visual interface
npm run db:studio
```

---

## Key Features

1. **Kaam (Task Coordination)**:
   - Shared task management with multi-person accountability, rotational/shared schedules, and streak tracking.
2. **Expenses & Settlement**:
   - Splitwise-style expense tracking with automatic equal/exact splits and pairwise debt simplification.
   - Pending settlement confirmation flow with push notifications and activity tracking.
3. **Real-Time Flat Chat**:
   - In-flat messaging with delivery status, read receipts, and edit/delete capabilities over Socket.io.
4. **Activity Feed**:
   - Unified live chronological log of all flat events (task completions, expenses added, settlements, and member joins).
5. **Multi-Platform Access**:
   - Full-featured Progressive Web App (PWA) with offline caching and native iOS/Android Expo mobile app.
