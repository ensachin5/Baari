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
      const successMsg = `[Session Verification SUCCESS via BetterAuth] ${req.method} ${reqUrl} | User ID: ${session.user.id} | Session ID: ${session.session.id}`;
      console.log(`\n>>> ${successMsg}\n`);
      logger.info({
        msg: `[Session Verification SUCCESS via BetterAuth] ${req.method} ${reqUrl}`,
        userId: session.user.id,
        sessionId: session.session.id,
        tokenSnippet: session.session.token ? `${session.session.token.substring(0, 12)}...` : undefined,
      });
      req.user = session.user as any;
      req.session = session.session as any;
      return next();
    }

    logger.info({
      msg: `[Session Verification BetterAuth Returned Null] ${req.method} ${reqUrl} - Attempting direct DB token fallback verification`,
    });

    // 2. Direct fallback verification: check Authorization: Bearer <token> or Cookie
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
      if (match?.[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      const failMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: No cookie (better-auth.session_token) or Authorization header token present in request headers.`;
      console.log(`\n<<< ${failMsg}\n`);
      logger.warn({
        msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
        reason: 'No cookie (better-auth.session_token) or Authorization header token present in request headers',
        hasCookieHeader: !!cookieHeader,
        hasAuthHeader: !!authHeader,
      });
      res.status(401).json({ error: 'Unauthorized. Valid session required.' });
      return;
    }

    const cleanToken = token.split('.')[0] || token;
    const tokenSnippet = cleanToken ? `${cleanToken.substring(0, 12)}...` : '';

    const [foundSession] = await db
      .select()
      .from(sessionTable)
      .where(and(eq(sessionTable.token, cleanToken), gt(sessionTable.expiresAt, new Date())));

    if (!foundSession) {
      // Check if session exists in DB but is expired
      const [expiredSession] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.token, cleanToken));

      if (expiredSession) {
        const expiredMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Token (${tokenSnippet}) found in DB for session ${expiredSession.id}, but session is EXPIRED (expired at: ${expiredSession.expiresAt.toISOString()})`;
        console.log(`\n<<< ${expiredMsg}\n`);
        logger.warn({
          msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
          reason: `Token (${tokenSnippet}) found in DB for session ${expiredSession.id}, but session is EXPIRED`,
          sessionId: expiredSession.id,
          userId: expiredSession.userId,
          expiresAt: expiredSession.expiresAt,
          currentTime: new Date(),
        });
      } else {
        const noSessionMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Token (${tokenSnippet}) present in request header/cookie but NO matching session record found in database.`;
        console.log(`\n<<< ${noSessionMsg}\n`);
        logger.warn({
          msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
          reason: `Token (${tokenSnippet}) present in request header/cookie, but NO matching session record found in database`,
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
      const noUserMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Session ${foundSession.id} found in DB for token ${tokenSnippet}, but user ${foundSession.userId} record not found in database.`;
      console.log(`\n<<< ${noUserMsg}\n`);
      logger.warn({
        msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
        reason: `Session ${foundSession.id} found in DB for token ${tokenSnippet}, but user ${foundSession.userId} record not found in database`,
        sessionId: foundSession.id,
        userId: foundSession.userId,
      });
      res.status(401).json({ error: 'Unauthorized. Valid session required.' });
      return;
    }

    const fallbackSuccessMsg = `[Session Verification SUCCESS via Fallback DB Lookup] ${req.method} ${reqUrl} | User ID: ${foundUser.id} | Session ID: ${foundSession.id}`;
    console.log(`\n>>> ${fallbackSuccessMsg}\n`);
    logger.info({
      msg: `[Session Verification SUCCESS via Fallback DB Lookup] ${req.method} ${reqUrl}`,
      userId: foundUser.id,
      sessionId: foundSession.id,
      tokenSnippet,
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
