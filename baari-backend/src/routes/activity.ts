import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { activityLog, user } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { eq, desc, lt, and } from 'drizzle-orm';

export const activityRouter = Router();

// Get paginated activity feed for a flat
activityRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  let conditions = eq(activityLog.flatId, flatId);
  if (cursor) {
    const cursorDate = new Date(cursor);
    conditions = and(conditions, lt(activityLog.createdAt, cursorDate)) as any;
  }

  const entries = await db
    .select({
      id: activityLog.id,
      flatId: activityLog.flatId,
      actorId: activityLog.actorId,
      type: activityLog.type,
      referenceId: activityLog.referenceId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      actorName: user.name,
      actorImage: user.image,
    })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.actorId, user.id))
    .where(conditions)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit + 1);

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({
    items,
    nextCursor,
    hasMore,
  });
});
