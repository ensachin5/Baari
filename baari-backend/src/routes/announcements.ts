import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { announcements, flatMembers, user } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { eq, and, desc } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastAnnouncementUpdated } from '../sockets/handlers.js';

export const announcementsRouter = Router();

// GET /api/announcements?flatId=
announcementsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  const userId = req.user!.id;

  // Verify caller is a flat member
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  const items = await db
    .select({
      id: announcements.id,
      flatId: announcements.flatId,
      postedBy: announcements.postedBy,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(announcements)
    .innerJoin(user, eq(announcements.postedBy, user.id))
    .where(eq(announcements.flatId, flatId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));

  res.json({ announcements: items });
});

// POST /api/announcements
announcementsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { flatId, title, body, pinned = true } = req.body || {};

  if (!flatId || !title?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'flatId, title, and body are required' });
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

  const [newAnnouncement] = await db
    .insert(announcements)
    .values({
      flatId,
      postedBy: userId,
      title: title.trim(),
      body: body.trim(),
      pinned: pinned !== false,
    })
    .returning();

  const [author] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId));

  const result = {
    ...newAnnouncement,
    authorName: author?.name || req.user!.name,
    authorImage: author?.image || req.user!.image,
  };

  try {
    const io = getIO();
    broadcastAnnouncementUpdated(io, flatId, { action: 'created', announcement: result });
  } catch (_) {}

  res.status(201).json({ announcement: result });
});

// DELETE /api/announcements/:id
announcementsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const announcementId = String(req.params.id);
  const userId = req.user!.id;

  const [announcement] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, announcementId));

  if (!announcement) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }

  // Check role: creator or admin
  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, announcement.flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  const isAuthor = announcement.postedBy === userId;
  const isAdmin = membership.role === 'admin';

  if (!isAuthor && !isAdmin) {
    res.status(403).json({ error: 'Only the author or flat admin can delete this announcement' });
    return;
  }

  await db.delete(announcements).where(eq(announcements.id, announcementId));

  try {
    const io = getIO();
    broadcastAnnouncementUpdated(io, announcement.flatId, { action: 'deleted', id: announcementId });
  } catch (_) {}

  res.json({ success: true, message: 'Announcement deleted successfully' });
});
