import { Router, Response } from 'express';
import { db } from '../db/index.js';
import {
  user,
  pushTokens,
  flatMembers,
  flats,
  taskOccurrenceMembers,
  settlements,
} from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, registerPushTokenSchema } from '../schemas/profile.js';
import { calculateUserStreak } from '../services/streaks.js';
import { eq, and, gte, or, count, sql } from 'drizzle-orm';

export const profileRouter = Router();

// GET /api/profile/stats?userId=
profileRouter.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req.query.userId as string) || req.user!.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Kaam completed this month
  const [completedKaam] = await db
    .select({ count: count() })
    .from(taskOccurrenceMembers)
    .where(
      and(
        eq(taskOccurrenceMembers.userId, userId),
        eq(taskOccurrenceMembers.status, 'completed'),
        gte(taskOccurrenceMembers.completedAt, startOfMonth)
      )
    );

  // 2. Streak
  const streak = await calculateUserStreak(userId);

  // 3. Expenses settled this month
  const confirmedSettlements = await db
    .select({
      amount: settlements.amount,
    })
    .from(settlements)
    .where(
      and(
        or(eq(settlements.paidBy, userId), eq(settlements.paidTo, userId)),
        eq(settlements.status, 'confirmed'),
        gte(settlements.confirmedAt, startOfMonth)
      )
    );

  const totalAmountSettled = confirmedSettlements.reduce(
    (sum, s) => sum + parseFloat(s.amount || '0'),
    0
  );

  res.json({
    stats: {
      kaamCompletedThisMonth: completedKaam?.count || 0,
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      settlementsCountThisMonth: confirmedSettlements.length,
      amountSettledThisMonth: Math.round(totalAmountSettled * 100) / 100,
    },
  });
});

// Get profile & flat status
profileRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId));

  if (!currentUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Get active flat
  const membership = await db
    .select({
      flatId: flats.id,
      flatName: flats.name,
      inviteCode: flats.inviteCode,
      role: flatMembers.role,
    })
    .from(flatMembers)
    .innerJoin(flats, eq(flatMembers.flatId, flats.id))
    .where(eq(flatMembers.userId, userId))
    .limit(1);

  const streak = await calculateUserStreak(userId);

  res.json({
    user: {
      ...currentUser,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    },
    activeFlat: membership[0] || null,
  });
});

// Update profile
profileRouter.patch(
  '/',
  requireAuth,
  validate(updateProfileSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { name, image } = req.body;

    const [updatedUser] = await db
      .update(user)
      .set({
        ...(name ? { name } : {}),
        ...(image !== undefined ? { image } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning();

    res.json({ user: updatedUser });
  }
);

// Register Push Token
profileRouter.post(
  '/push-token',
  requireAuth,
  validate(registerPushTokenSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { token, deviceType } = req.body;

    // Check if token already exists
    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));

    if (!existing) {
      await db.insert(pushTokens).values({
        userId,
        token,
        deviceType,
      });
    }

    res.json({ message: 'Push token registered successfully' });
  }
);
