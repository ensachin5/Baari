# Baari (बारी) — Shared Living Coordination Platform

Baari is a mobile app and backend system designed for flatmates, roommates, and hostel-mates to coordinate shared household responsibilities (Kaam), track & split expenses, and communicate in real time.

---

## Repository Structure

- **`baari-backend/`**: Express (TypeScript), Better Auth, Drizzle ORM (PostgreSQL), Socket.io, Zod, Pino, Helmet, Rate Limiting.
- **`baari-app/`**: React Native (Expo SDK 52+, Expo Router, New Architecture), Zustand, Socket.io client, React Native StyleSheet (no Tailwind).
- **`docs/baari-prd.md`**: Complete PRD & TRD single source of truth.

---

## Quick Start

### 1. Backend Setup (`baari-backend`)

```bash
cd baari-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configure DATABASE_URL, BETTER_AUTH_SECRET in .env

# Run database migrations
npm run db:push

# Start development server (http://localhost:3000)
npm run dev
```

### 2. Frontend Setup (`baari-app`)

```bash
cd baari-app

# Install dependencies
npm install

# Start Expo dev server
npm run start
```

---

## Architecture & Features

1. **Home Tab (Kaam + Swipe-to-Chat)**:
   - Shared task management with multi-person accountability (per-member completion tracking).
   - Swipe right-to-left reveals the WhatsApp-style real-time group chat via Socket.io.
2. **Expense Tab**:
   - Splitwise-style expense tracking with automatic equal/exact splits and pairwise debt simplification.
   - Category spending breakdown and direct settlement recording.
3. **Activity Tab**:
   - Unified live feed of all flat events (task completions, expenses added, settlements, new members).
4. **Profile Tab**:
   - User profile, 1-tap copy/share flat invite code, member role badges, and settings.
