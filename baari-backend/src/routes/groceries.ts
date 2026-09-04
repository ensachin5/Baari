import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { groceryItems, flatMembers, user } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getIO } from '../sockets/index.js';
import { broadcastGroceryUpdated } from '../sockets/handlers.js';

export const groceriesRouter = Router();

const addedByUser = alias(user, 'added_by_user');
const boughtByUser = alias(user, 'bought_by_user');

// GET /api/grocery-items?flatId=&status=
groceriesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const statusFilter = req.query.status as 'needed' | 'bought' | undefined;

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
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  let query = db
    .select({
      id: groceryItems.id,
      flatId: groceryItems.flatId,
      itemName: groceryItems.itemName,
      status: groceryItems.status,
      addedBy: groceryItems.addedBy,
      boughtBy: groceryItems.boughtBy,
      boughtAt: groceryItems.boughtAt,
      createdAt: groceryItems.createdAt,
      addedByName: addedByUser.name,
      addedByImage: addedByUser.image,
      boughtByName: boughtByUser.name,
      boughtByImage: boughtByUser.image,
    })
    .from(groceryItems)
    .innerJoin(addedByUser, eq(groceryItems.addedBy, addedByUser.id))
    .leftJoin(boughtByUser, eq(groceryItems.boughtBy, boughtByUser.id))
    .where(
      statusFilter
        ? and(eq(groceryItems.flatId, flatId), eq(groceryItems.status, statusFilter))
        : eq(groceryItems.flatId, flatId)
    )
    .orderBy(desc(groceryItems.createdAt));

  const items = await query;
  res.json({ items });
});

// POST /api/grocery-items
groceriesRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { flatId, itemName } = req.body || {};

  if (!flatId || !itemName?.trim()) {
    res.status(400).json({ error: 'flatId and itemName are required' });
    return;
  }

  // Verify membership
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  const [newItem] = await db
    .insert(groceryItems)
    .values({
      flatId,
      itemName: itemName.trim(),
      addedBy: userId,
      status: 'needed',
    })
    .returning();

  const [adder] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId));

  const result = {
    ...newItem,
    addedByName: adder?.name || req.user!.name,
    addedByImage: adder?.image || req.user!.image,
    boughtByName: null,
    boughtByImage: null,
  };

  try {
    const io = getIO();
    broadcastGroceryUpdated(io, flatId, { action: 'created', item: result });
  } catch (_) {}

  res.status(201).json({ item: result });
});

// PATCH /api/grocery-items/:id/bought
groceriesRouter.patch('/:id/bought', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = String(req.params.id);
  const userId = req.user!.id;
  const { bought = true } = req.body || {};

  const [item] = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.id, itemId));

  if (!item) {
    res.status(404).json({ error: 'Grocery item not found' });
    return;
  }

  // Verify membership
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, item.flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  const newStatus = bought ? 'bought' : 'needed';
  const newBoughtBy = bought ? userId : null;
  const newBoughtAt = bought ? new Date() : null;

  const [updated] = await db
    .update(groceryItems)
    .set({
      status: newStatus,
      boughtBy: newBoughtBy,
      boughtAt: newBoughtAt,
    })
    .where(eq(groceryItems.id, itemId))
    .returning();

  const [adder] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, updated.addedBy));

  let buyerName: string | null = null;
  let buyerImage: string | null = null;

  if (updated.boughtBy) {
    const [buyer] = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, updated.boughtBy));
    buyerName = buyer?.name || null;
    buyerImage = buyer?.image || null;
  }

  const result = {
    ...updated,
    addedByName: adder?.name || null,
    addedByImage: adder?.image || null,
    boughtByName: buyerName,
    boughtByImage: buyerImage,
  };

  try {
    const io = getIO();
    broadcastGroceryUpdated(io, item.flatId, { action: 'updated', item: result });
  } catch (_) {}

  res.json({ item: result });
});

// DELETE /api/grocery-items/:id
groceriesRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = String(req.params.id);
  const userId = req.user!.id;

  const [item] = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.id, itemId));

  if (!item) {
    res.status(404).json({ error: 'Grocery item not found' });
    return;
  }

  // Verify membership
  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, item.flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  const isAdder = item.addedBy === userId;
  const isAdmin = membership.role === 'admin';

  if (!isAdder && !isAdmin) {
    res.status(403).json({ error: 'Only the creator or admin can delete this grocery item' });
    return;
  }

  await db.delete(groceryItems).where(eq(groceryItems.id, itemId));

  try {
    const io = getIO();
    broadcastGroceryUpdated(io, item.flatId, { action: 'deleted', id: itemId });
  } catch (_) {}

  res.json({ success: true, message: 'Grocery item deleted successfully' });
});
