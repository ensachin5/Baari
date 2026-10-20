import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

interface CachedSession {
  user: any;
  expiresAt: number;
}

// In-memory cache to avoid duplicate DB lookups for session validation on every micro-request
const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

function extractAuthKey(headersObj: Headers): string | null {
  const authHeader = headersObj.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookieHeader = headersObj.get('cookie') || '';
  const match = cookieHeader.match(/(?:better-auth\.session_token|session_token)=([^;]+)/);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

export async function getSessionUser(req?: Request) {
  try {
    const reqHeaders = req ? req.headers : await headers();
    const cacheKey = extractAuthKey(reqHeaders);

    const now = Date.now();
    if (cacheKey) {
      const cached = sessionCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.user;
      }
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session?.user) {
      if (cacheKey) sessionCache.delete(cacheKey);
      return null;
    }

    if (cacheKey) {
      // Clean up old entries if cache grows
      if (sessionCache.size > 2000) {
        for (const [key, val] of sessionCache.entries()) {
          if (val.expiresAt <= now) sessionCache.delete(key);
        }
      }
      sessionCache.set(cacheKey, {
        user: session.user,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    return session.user;
  } catch (err) {
    console.error('[getSessionUser Error]', err);
    return null;
  }
}

export function invalidateSessionCache(tokenOrCookie?: string) {
  if (tokenOrCookie) {
    sessionCache.delete(tokenOrCookie);
  } else {
    sessionCache.clear();
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized. Please sign in.' },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden.') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

