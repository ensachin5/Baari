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
   - **Region**: Select your preferred region (closest to your users or Neon DB region)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables in Render:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (must include `?sslmode=require`)
   - `BETTER_AUTH_SECRET`: A secure random secret string
   - `BETTER_AUTH_URL`: Your deployed Render service URL (e.g., `https://baari-backend.onrender.onrender.com`)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `RESEND_API_KEY`: Your Resend API Key
   - `PORT`: `3000` (or leave default for Render)
   - `NODE_ENV`: `production`

> **Note on Free Tier**: Render's free Web Service spins down after 15 minutes of inactivity. The first HTTP request after inactivity may experience a ~30-second cold-start delay while the server boots up.

---

## Database (Neon PostgreSQL)

Migrations are managed via Drizzle ORM:

```bash
# Push schema changes to Neon DB
npm run db:push
```
