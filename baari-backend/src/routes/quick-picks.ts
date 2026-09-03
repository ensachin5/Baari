import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { quickPickPresets, flatMembers } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createQuickPickSchema, updateQuickPickSchema } from '../schemas/quick-picks.js';
import { eq, and, asc } from 'drizzle-orm';

export const quickPicksRouter = Router();

export const DEFAULT_QUICK_PICKS = [
  { label: 'Water', title: 'Water Tank Refill', category: 'water' as const, sortOrder: 0 },
  { label: 'Trash', title: 'Trash', category: 'garbage' as const, sortOrder: 1 },
  { label: 'Sweeping', title: 'Sweeping', category: 'chore' as const, sortOrder: 2 },
  { label: 'Bathroom', title: 'Bathroom', category: 'chore' as const, sortOrder: 3 },
  { label: 'Dishes', title: 'Dishes', category: 'chore' as const, sortOrder: 4 },
  { label: 'Laundry', title: 'Laundry', category: 'chore' as const, sortOrder: 5 },
  { label: 'Groceries', title: 'Groceries', category: 'custom' as const, sortOrder: 6 },
];

// 1. GET /api/quick-picks?flatId=
quickPicksRouter.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    if (!flatId) {
      res.status(400).json({ error: 'flatId query param is required' });
      return;
    }

    const userId = req.user!.id;
    // Verify membership
    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this flat' });
      return;
    }

    let presets = await db
      .select()
      .from(quickPickPresets)
      .where(eq(quickPickPresets.flatId, flatId))
      .orderBy(asc(quickPickPresets.sortOrder));

    // If flat has no presets seeded yet, auto-seed defaults
    if (presets.length === 0) {
      const toInsert = DEFAULT_QUICK_PICKS.map((p) => ({
        flatId,
        label: p.label,
        title: p.title,
        category: p.category,
        sortOrder: p.sortOrder,
      }));

      presets = await db.insert(quickPickPresets).values(toInsert).returning();
      presets.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    res.json({ presets });
  }
);

// 2. POST /api/quick-picks
quickPicksRouter.post(
  '/',
  requireAuth,
  validate(createQuickPickSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, label, title, category, sortOrder } = req.body;
    const userId = req.user!.id;

    // Verify membership
    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this flat' });
      return;
    }

    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const existing = await db
        .select({ sortOrder: quickPickPresets.sortOrder })
        .from(quickPickPresets)
        .where(eq(quickPickPresets.flatId, flatId))
        .orderBy(asc(quickPickPresets.sortOrder));

      const maxOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;
      finalSortOrder = maxOrder + 1;
    }

    const [newPreset] = await db
      .insert(quickPickPresets)
      .values({
        flatId,
        label,
        title,
        category,
        sortOrder: finalSortOrder,
      })
      .returning();

    res.status(201).json({ preset: newPreset });
  }
);

// 3. PATCH /api/quick-picks/:id
quickPicksRouter.patch(
  '/:id',
  requireAuth,
  validate(updateQuickPickSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const presetId = String(req.params.id);
    const { label, title, category, sortOrder } = req.body;
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(quickPickPresets)
      .where(eq(quickPickPresets.id, presetId));

    if (!existing) {
      res.status(404).json({ error: 'Preset not found' });
      return;
    }

    // Verify caller belongs to flat
    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this flat' });
      return;
    }

    const updatePayload: Partial<typeof quickPickPresets.$inferInsert> = {};
    if (label !== undefined) updatePayload.label = label;
    if (title !== undefined) updatePayload.title = title;
    if (category !== undefined) updatePayload.category = category;
    if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;

    const [updatedPreset] = await db
      .update(quickPickPresets)
      .set(updatePayload)
      .where(eq(quickPickPresets.id, presetId))
      .returning();

    res.json({ preset: updatedPreset });
  }
);

// 4. DELETE /api/quick-picks/:id
quickPicksRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const presetId = String(req.params.id);
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(quickPickPresets)
      .where(eq(quickPickPresets.id, presetId));

    if (!existing) {
      res.status(404).json({ error: 'Preset not found' });
      return;
    }

    // Verify caller belongs to flat
    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this flat' });
      return;
    }

    await db.delete(quickPickPresets).where(eq(quickPickPresets.id, presetId));

    res.json({ success: true, message: 'Preset deleted' });
  }
);
