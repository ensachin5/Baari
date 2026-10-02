import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { db } from '../db/index.js';
import { session as sessionTable, user as userTable } from '../db/auth-schema.js';
import { eq, and, gt } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
      };
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

import { logger } from './error-handler.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const reqUrl = req.originalUrl || req.url;
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie;

  const logHeaderInfo = {
    method: req.method,
    url: reqUrl,
    hasCookie: !!cookieHeader,
    cookieSnippet: cookieHeader ? (cookieHeader.length > 60 ? `${cookieHeader.substring(0, 60)}...` : cookieHeader) : 'NONE',
    hasAuthHeader: !!authHeader,
    authHeaderSnippet: authHeader ? `${authHeader.substring(0, 25)}...` : 'NONE',
    host: req.headers.host,
    referer: req.headers.referer,
  };

  logger.info({
    msg: `[Session Verification START] ${req.method} ${reqUrl}`,
    ...logHeaderInfo,
  });

  try {
    // 1. Primary verification: Better Auth getSession with parsed node headers
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      logger.info({
        msg: `[Session Verification SUCCESS via BetterAuth] ${req.method} ${reqUrl}`,
        userId: session.user.id,
        sessionId: session.session.id,
      });
      req.user = session.user as any;
      req.session = session.session as any;
      return next();
    }

    logger.debug({
      msg: `[Session Verification BetterAuth Returned Null] ${req.method} ${reqUrl} - Attempting direct DB token fallback verification`,
    });

    // 2. Direct fallback verification: check Authorization: Bearer <token> or Cookie
    let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/(?:better-auth\.session_token|baari\.session_token|session_token|baari_session_token)=([^;]+)/);
      if (match?.[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      logger.warn({
        msg: `[requireAuth REJECTED] ${req.method} ${reqUrl}`,
        reason: 'No session cookie or Authorization header token present',
      });
      res.status(401).json({ error: 'Unauthorized. Valid session required.' });
      return;
    }

    let decodedToken = token;
    try {
      decodedToken = decodeURIComponent(token);
    } catch (_) {}
    const cleanToken = decodedToken
      .replace(/^Bearer\s+/i, '')
      .replace(/^s:/, '')
      .replace(/^["']|["']$/g, '')
      .split('.')[0]
      .trim();
    const tokenSnippet = cleanToken ? `${cleanToken.substring(0, 12)}...` : '';

    const [foundSession] = await db
      .select()
      .from(sessionTable)
      .where(and(eq(sessionTable.token, cleanToken), gt(sessionTable.expiresAt, new Date())));

    if (!foundSession) {
      const [expiredSession] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.token, cleanToken));

      if (expiredSession) {
        logger.warn({
          msg: `[Session Verification FAIL] ${req.method} ${reqUrl} - Token found but session expired`,
          sessionId: expiredSession.id,
          userId: expiredSession.userId,
          expiresAt: expiredSession.expiresAt,
        });
      } else {
        logger.warn({
          msg: `[Session Verification FAIL] ${req.method} ${reqUrl} - Token present but no matching session record found`,
          tokenSnippet,
        });
      }

      res.status(401).json({ error: 'Unauthorized. Valid session required.' });
      return;
    }

    const [foundUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, foundSession.userId));

    if (!foundUser) {
      logger.warn({
        msg: `[Session Verification FAIL] ${req.method} ${reqUrl} - Session found but user record not found`,
        sessionId: foundSession.id,
        userId: foundSession.userId,
      });
      res.status(401).json({ error: 'Unauthorized. Valid session required.' });
      return;
    }

    logger.info({
      msg: `[Session Verification SUCCESS via Fallback DB Lookup] ${req.method} ${reqUrl}`,
      userId: foundUser.id,
      sessionId: foundSession.id,
    });

    req.user = foundUser as any;
    req.session = foundSession as any;
    return next();
  } catch (error: any) {
    const errorMsg = `[Session Verification ERROR] ${req.method} ${reqUrl} | Error: ${error?.message || error}`;
    console.log(`\n<<< ${errorMsg}\n`);
    logger.error({
      msg: `[Session Verification ERROR] ${req.method} ${reqUrl}`,
      error: error?.message || error,
      stack: error?.stack,
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
};
