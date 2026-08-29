"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatsRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const flats_js_1 = require("../schemas/flats.js");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_2 = require("../sockets/index.js");
const handlers_js_1 = require("../sockets/handlers.js");
const streaks_js_1 = require("../services/streaks.js");
exports.flatsRouter = (0, express_1.Router)();
// Helper to generate a 6-character clean alphanumeric invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// Get user's current flat
exports.flatsRouter.get(['/my-flat', '/me'], auth_guard_js_1.requireAuth, async (req, res) => {
    const userId = req.user.id;
    const membership = await index_js_1.db
        .select({
        id: schema_js_1.flats.id,
        name: schema_js_1.flats.name,
        inviteCode: schema_js_1.flats.inviteCode,
        createdBy: schema_js_1.flats.createdBy,
        createdAt: schema_js_1.flats.createdAt,
        role: schema_js_1.flatMembers.role,
        joinedAt: schema_js_1.flatMembers.joinedAt,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.flats, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, schema_js_1.flats.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, userId))
        .limit(1);
    if (membership.length === 0) {
        res.json({ flat: null });
        return;
    }
    res.json({ flat: membership[0] });
});
// Create flat
exports.flatsRouter.post('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(flats_js_1.createFlatSchema), async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
        const existing = await index_js_1.db.select({ id: schema_js_1.flats.id }).from(schema_js_1.flats).where((0, drizzle_orm_1.eq)(schema_js_1.flats.inviteCode, inviteCode));
        if (existing.length === 0) {
            isUnique = true;
        }
        else {
            inviteCode = generateInviteCode();
            attempts++;
        }
    }
    // Insert flat
    const [newFlat] = await index_js_1.db
        .insert(schema_js_1.flats)
        .values({
        name,
        inviteCode,
        createdBy: userId,
    })
        .returning();
    // Add creator as admin member
    await index_js_1.db.insert(schema_js_1.flatMembers).values({
        flatId: newFlat.id,
        userId,
        role: 'admin',
    });
    // Log activity
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId: newFlat.id,
        actorId: userId,
        type: 'member_joined',
        referenceId: newFlat.id,
        metadata: { flatName: newFlat.name, role: 'admin' },
    })
        .returning();
    res.status(201).json({ flat: newFlat });
});
// Join flat via invite code
exports.flatsRouter.post('/join', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(flats_js_1.joinFlatSchema), async (req, res) => {
    const { inviteCode } = req.body;
    const userId = req.user.id;
    const [foundFlat] = await index_js_1.db
        .select()
        .from(schema_js_1.flats)
        .where((0, drizzle_orm_1.eq)(schema_js_1.flats.inviteCode, inviteCode.toUpperCase().trim()));
    if (!foundFlat) {
        res.status(404).json({ error: 'Invalid invite code. Flat not found.' });
        return;
    }
    // Check if user is already a member
    const [existingMember] = await index_js_1.db
        .select()
        .from(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, foundFlat.id), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, userId)));
    if (existingMember) {
        res.json({ message: 'Already a member of this flat', flat: foundFlat });
        return;
    }
    // Add as member
    await index_js_1.db.insert(schema_js_1.flatMembers).values({
        flatId: foundFlat.id,
        userId,
        role: 'member',
    });
    // Activity log
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId: foundFlat.id,
        actorId: userId,
        type: 'member_joined',
        referenceId: foundFlat.id,
        metadata: { flatName: foundFlat.name, role: 'member' },
    })
        .returning();
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, foundFlat.id, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    res.json({ message: 'Successfully joined flat', flat: foundFlat });
});
// Get members of a flat
exports.flatsRouter.get('/:id/members', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = String(req.params.id);
    const members = await index_js_1.db
        .select({
        id: schema_js_1.flatMembers.id,
        flatId: schema_js_1.flatMembers.flatId,
        userId: schema_js_1.flatMembers.userId,
        role: schema_js_1.flatMembers.role,
        joinedAt: schema_js_1.flatMembers.joinedAt,
        name: schema_js_1.user.name,
        email: schema_js_1.user.email,
        image: schema_js_1.user.image,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId))
        .orderBy((0, drizzle_orm_1.asc)(schema_js_1.flatMembers.joinedAt));
    const membersWithStreaks = await Promise.all(members.map(async (m) => {
        const streak = await (0, streaks_js_1.calculateUserStreak)(m.userId);
        return {
            ...m,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
        };
    }));
    res.json({ members: membersWithStreaks });
});
// Get single flat details
exports.flatsRouter.get('/:id', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = String(req.params.id);
    const [foundFlat] = await index_js_1.db.select().from(schema_js_1.flats).where((0, drizzle_orm_1.eq)(schema_js_1.flats.id, flatId));
    if (!foundFlat) {
        res.status(404).json({ error: 'Flat not found' });
        return;
    }
    res.json({ flat: foundFlat });
});
// Admin-only remove member from flat
exports.flatsRouter.delete('/:id/members/:userId', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    const currentUserId = req.user.id;
    // Check if current user is admin of this flat
    const [currentMembership] = await index_js_1.db
        .select()
        .from(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, currentUserId)));
    if (!currentMembership || currentMembership.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden. Only flat admins can remove members.' });
        return;
    }
    // Remove target user
    await index_js_1.db
        .delete(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, targetUserId)));
    res.json({ message: 'Member removed successfully' });
});
// Leave flat
exports.flatsRouter.post('/:id/leave', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = String(req.params.id);
    const currentUserId = req.user.id;
    const [currentMembership] = await index_js_1.db
        .select()
        .from(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, currentUserId)));
    if (!currentMembership) {
        res.status(404).json({ error: 'You are not a member of this flat.' });
        return;
    }
    // Check if user is the only admin while other members exist
    if (currentMembership.role === 'admin') {
        const allMembers = await index_js_1.db
            .select()
            .from(schema_js_1.flatMembers)
            .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId));
        const otherAdmins = allMembers.filter((m) => m.role === 'admin' && m.userId !== currentUserId);
        const otherMembers = allMembers.filter((m) => m.userId !== currentUserId);
        if (otherAdmins.length === 0 && otherMembers.length > 0) {
            res.status(400).json({ error: 'Please assign another admin before leaving the flat.' });
            return;
        }
    }
    // Remove current user from flat_members
    await index_js_1.db
        .delete(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, currentUserId)));
    res.json({ message: 'Successfully left the flat' });
});
