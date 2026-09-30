# Baari Backend — Express & Drizzle API Server

API backend service for Baari (shared household management platform), powered by Express, Better Auth, Drizzle ORM (PostgreSQL), Socket.io, Zod, Pino, and Helmet.

---

## Deploy to Render

Follow these steps to deploy the Express backend to **Render**:

1. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the Web Service:
   - **Name**: `baari-backend`
   - **Root Directory**: `baari-backend`
   - **Environment**: `Node`
   - **Region**: Select your preferred region (closest to your users or Supabase region)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables in Render:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (Transaction pooler on port 6543 or Session pooler on port 5432)
   - `DIRECT_URL`: Supabase Direct connection string on port 5432 (used by Drizzle for migrations)
   - `BETTER_AUTH_SECRET`: A secure random secret string (e.g., generated with `openssl rand -base64 32`)
   - `BETTER_AUTH_URL`: Your deployed backend service URL (e.g., `https://baari-backend.onrender.com`)
   - `CLIENT_URL`: Your deployed frontend web URL (e.g., `https://baari-web.vercel.app`)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `http://localhost:3000,https://baari-web.vercel.app`)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (optional if using email & password)
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret (optional if using email & password)
   - `RESEND_API_KEY`: Your Resend API Key (for weekly email digests)
   - `PORT`: `3000` (or leave default for Render)
   - `NODE_ENV`: `production`

> **Note on Free Tier**: Render's free Web Service spins down after 15 minutes of inactivity. The first HTTP request after inactivity may experience a ~30-second cold-start delay while the server boots up.

---

## Database (Supabase PostgreSQL)

Migrations are managed via Drizzle ORM:

```bash
# Generate new migration files based on schema changes
npm run db:generate

# Apply pending migrations to Supabase database
npm run db:migrate

# Push schema directly (development prototyping only)
npm run db:push

# Launch Drizzle Studio to inspect database data
npm run db:studio
```
