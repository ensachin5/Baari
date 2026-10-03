import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  settlements,
  user,
  activityLog,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { validate } from '../../middleware/validate.js';
import { createSettlementSchema } from '../../schemas/expenses.js';
import { eq, and, desc } from 'drizzle-orm';
import { getIO } from '../../sockets/index.js';
import { broadcastActivityEvent } from '../../sockets/handlers.js';
import { sendPushNotification } from '../../services/push.js';
import { logger } from '../../middleware/error-handler.js';
import { isFlatMember } from '../../utils/index.js';

export const settlementsRouter = Router();

// GET /api/expenses/settlements/pending?flatId= (Pending settlements for recipient)
settlementsRouter.get(
  '/settlements/pending',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const userId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    if (!(await isFlatMember(flatId, userId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const pending = await db
      .select({
        id: settlements.id,
        flatId: settlements.flatId,
        paidBy: settlements.paidBy,
        paidTo: settlements.paidTo,
        amount: settlements.amount,
        note: settlements.note,
        status: settlements.status,
        createdAt: settlements.createdAt,
        payerName: user.name,
        payerImage: user.image,
      })
      .from(settlements)
      .innerJoin(user, eq(settlements.paidBy, user.id))
      .where(
        and(
          eq(settlements.flatId, flatId),
          eq(settlements.paidTo, userId),
          eq(settlements.status, 'pending')
        )
      )
      .orderBy(desc(settlements.createdAt));

    res.json({ pendingSettlements: pending });
  }
);

// POST /api/expenses/settle and POST /api/expenses/settlements
settlementsRouter.post(
  ['/settle', '/settlements'],
  requireAuth,
  validate(createSettlementSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, paidTo, amount, note } = req.body;
    const paidBy = req.user!.id;

    if (!(await isFlatMember(flatId, paidBy))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    if (!(await isFlatMember(flatId, paidTo))) {
      res.status(400).json({ error: 'Recipient is not a member of this flat.' });
      return;
    }

    // Insert settlement as pending
    const [newSettlement] = await db
      .insert(settlements)
      .values({
        flatId,
        paidBy,
        paidTo,
        amount: amount.toString(),
        note,
        status: 'pending',
      })
      .returning();

    logger.info(
      {
        settlementId: newSettlement.id,
        amount,
        paidBy,
        paidTo,
        payerName: req.user!.name,
      },
      '[Push Trigger 4: Expense Added / Settlement] Code path reached for settlement payment sent push'
    );
    sendPushNotification([paidTo], {
      title: 'Settlement Payment Sent',
      body: `${req.user!.name} sent you ₹${amount}. Tap to confirm receipt.`,
      data: { type: 'settlement', settlementId: newSettlement.id },
    });

    res.status(201).json({
      settlement: newSettlement,
      message: 'Settlement recorded and pending confirmation from recipient',
    });
  }
);

// PATCH /api/expenses/settlements/:id/confirm (Recipient confirms settlement)
settlementsRouter.patch(
  '/settlements/:id/confirm',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const settlementId = String(req.params.id);
    const userId = req.user!.id;

    const [st] = await db.select().from(settlements).where(eq(settlements.id, settlementId));
    if (!st) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    if (st.paidTo !== userId) {
      res.status(403).json({ error: 'Only the recipient can confirm this settlement' });
      return;
    }

    const [confirmed] = await db
      .update(settlements)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
      })
      .where(eq(settlements.id, settlementId))
      .returning();

    // Log activity
    const [payer] = await db.select({ name: user.name }).from(user).where(eq(user.id, st.paidBy));
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: st.flatId,
        actorId: userId,
        type: 'settlement_confirmed',
        referenceId: confirmed.id,
        metadata: {
          amount: confirmed.amount,
          paidByName: payer?.name || 'Flatmate',
          confirmedByName: req.user!.name,
        },
      })
      .returning();

    try {
      const io = getIO();
      broadcastActivityEvent(io, st.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
      io.to(`flat:${st.flatId}`).emit('balance_updated', { flatId: st.flatId });
    } catch (_) {}

    logger.info(
      {
        settlementId,
        amount: st.amount,
        paidBy: st.paidBy,
        confirmedBy: req.user!.id,
        confirmedByName: req.user!.name,
      },
      '[Push Trigger 4: Expense Added / Settlement] Code path reached for settlement confirmed push'
    );
    sendPushNotification([st.paidBy], {
      title: 'Settlement Confirmed! ✅',
      body: `${req.user!.name} confirmed receiving your payment of ₹${st.amount}`,
      data: { type: 'settlement', settlementId },
    });

    res.json({ message: 'Settlement confirmed', settlement: confirmed });
  }
);

// PATCH /api/expenses/settlements/:id/reject (Recipient rejects settlement)
settlementsRouter.patch(
  '/settlements/:id/reject',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const settlementId = String(req.params.id);
    const userId = req.user!.id;

    const [st] = await db.select().from(settlements).where(eq(settlements.id, settlementId));
    if (!st) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    if (st.paidTo !== userId) {
      res.status(403).json({ error: 'Only the recipient can reject this settlement' });
      return;
    }

    const [rejected] = await db
      .update(settlements)
      .set({ status: 'rejected' })
      .where(eq(settlements.id, settlementId))
      .returning();

    logger.info(
      {
        settlementId,
        amount: st.amount,
        paidBy: st.paidBy,
        rejectedBy: req.user!.id,
        rejectedByName: req.user!.name,
      },
      '[Push Trigger 4: Expense Added / Settlement] Code path reached for settlement rejected push'
    );
    sendPushNotification([st.paidBy], {
      title: 'Settlement Rejected ❌',
      body: `${req.user!.name} could not confirm receiving your payment of ₹${st.amount}`,
      data: { type: 'settlement', settlementId },
    });

    res.json({ message: 'Settlement rejected', settlement: rejected });
  }
);
