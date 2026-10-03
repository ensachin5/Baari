import { db } from '../db/index.js';
import { flatMembers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Check if a user is a active member of a flat.
 */
export async function isFlatMember(flatId: string, userId: string): Promise<boolean> {
  if (!flatId || !userId) return false;
  const [membership] = await db
    .select({ id: flatMembers.id })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));
  return !!membership;
}

/**
 * Get flat membership details (e.g. role) for a user in a flat.
 */
export async function getFlatMembership(flatId: string, userId: string) {
  if (!flatId || !userId) return null;
  const [membership] = await db
    .select({ id: flatMembers.id, role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));
  return membership || null;
}
