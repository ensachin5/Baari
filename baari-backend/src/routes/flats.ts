import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { flats, flatMembers, user, activityLog } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createFlatSchema, joinFlatSchema } from '../schemas/flats.js';
import { eq, and } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastActivityEvent } from '../sockets/handlers.js';

export const flatsRouter = Router();

// Helper to generate a 6-character clean alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get user's current flat
flatsRouter.get('/my-flat', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const membership = await db
    .select({
      id: flats.id,
      name: flats.name,
      inviteCode: flats.inviteCode,
      createdBy: flats.createdBy,
      createdAt: flats.createdAt,
      role: flatMembers.role,
      joinedAt: flatMembers.joinedAt,
    })
    .from(flatMembers)
    .innerJoin(flats, eq(flatMembers.flatId, flats.id))
    .where(eq(flatMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) {
    res.json({ flat: null });
    return;
  }

  res.json({ flat: membership[0] });
});

// Create flat
flatsRouter.post(
  '/',
  requireAuth,
  validate(createFlatSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { name } = req.body;
    const userId = req.user!.id;

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const existing = await db.select({ id: flats.id }).from(flats).where(eq(flats.inviteCode, inviteCode));
      if (existing.length === 0) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    // Insert flat
    const [newFlat] = await db
      .insert(flats)
      .values({
        name,
        inviteCode,
        createdBy: userId,
      })
      .returning();

    // Add creator as admin member
    await db.insert(flatMembers).values({
      flatId: newFlat.id,
      userId,
      role: 'admin',
    });

    // Log activity
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: newFlat.id,
        actorId: userId,
        type: 'member_joined',
        referenceId: newFlat.id,
        metadata: { flatName: newFlat.name, role: 'admin' },
      })
      .returning();

    res.status(201).json({ flat: newFlat });
  }
);

// Join flat via invite code
flatsRouter.post(
  '/join',
  requireAuth,
  validate(joinFlatSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { inviteCode } = req.body;
    const userId = req.user!.id;

    const [foundFlat] = await db
      .select()
      .from(flats)
      .where(eq(flats.inviteCode, inviteCode.toUpperCase().trim()));

    if (!foundFlat) {
      res.status(404).json({ error: 'Invalid invite code. Flat not found.' });
      return;
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, foundFlat.id), eq(flatMembers.userId, userId)));

    if (existingMember) {
      res.json({ message: 'Already a member of this flat', flat: foundFlat });
      return;
    }

    // Add as member
    await db.insert(flatMembers).values({
      flatId: foundFlat.id,
      userId,
      role: 'member',
    });

    // Activity log
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: foundFlat.id,
        actorId: userId,
        type: 'member_joined',
        referenceId: foundFlat.id,
        metadata: { flatName: foundFlat.name, role: 'member' },
      })
      .returning();

    try {
      const io = getIO();
      broadcastActivityEvent(io, foundFlat.id, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    res.json({ message: 'Successfully joined flat', flat: foundFlat });
  }
);

// Get members of a flat
flatsRouter.get('/:id/members', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = String(req.params.id);

  const members = await db
    .select({
      id: flatMembers.id,
      flatId: flatMembers.flatId,
      userId: flatMembers.userId,
      role: flatMembers.role,
      joinedAt: flatMembers.joinedAt,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(flatMembers)
    .innerJoin(user, eq(flatMembers.userId, user.id))
    .where(eq(flatMembers.flatId, flatId));

  res.json({ members });
});

// Get single flat details
flatsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = String(req.params.id);

  const [foundFlat] = await db.select().from(flats).where(eq(flats.id, flatId));

  if (!foundFlat) {
    res.status(404).json({ error: 'Flat not found' });
    return;
  }

  res.json({ flat: foundFlat });
});
