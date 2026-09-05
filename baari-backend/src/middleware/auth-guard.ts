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

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Primary verification: Better Auth getSession with parsed node headers
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      req.user = session.user as any;
      req.session = session.session as any;
      return next();
    }

    // 2. Direct fallback verification: check Authorization: Bearer <token> or Cookie
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
      if (match?.[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (token) {
      const cleanToken = token.split('.')[0] || token;
      const [foundSession] = await db
        .select()
        .from(sessionTable)
        .where(and(eq(sessionTable.token, cleanToken), gt(sessionTable.expiresAt, new Date())));

      if (foundSession) {
        const [foundUser] = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, foundSession.userId));

        if (foundUser) {
          req.user = foundUser as any;
          req.session = foundSession as any;
          return next();
        }
      }
    }

    res.status(401).json({ error: 'Unauthorized. Valid session required.' });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
