"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const profile_js_1 = require("../schemas/profile.js");
const streaks_js_1 = require("../services/streaks.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.profileRouter = (0, express_1.Router)();
// Get profile & flat status
exports.profileRouter.get('/', auth_guard_js_1.requireAuth, async (req, res) => {
    const userId = req.user.id;
    const [currentUser] = await index_js_1.db
        .select({
        id: schema_js_1.user.id,
        name: schema_js_1.user.name,
        email: schema_js_1.user.email,
        image: schema_js_1.user.image,
        createdAt: schema_js_1.user.createdAt,
    })
        .from(schema_js_1.user)
        .where((0, drizzle_orm_1.eq)(schema_js_1.user.id, userId));
    if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    // Get active flat
    const membership = await index_js_1.db
        .select({
        flatId: schema_js_1.flats.id,
        flatName: schema_js_1.flats.name,
        inviteCode: schema_js_1.flats.inviteCode,
        role: schema_js_1.flatMembers.role,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.flats, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, schema_js_1.flats.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, userId))
        .limit(1);
    const streak = await (0, streaks_js_1.calculateUserStreak)(userId);
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
exports.profileRouter.patch('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(profile_js_1.updateProfileSchema), async (req, res) => {
    const userId = req.user.id;
    const { name, image } = req.body;
    const [updatedUser] = await index_js_1.db
        .update(schema_js_1.user)
        .set({
        ...(name ? { name } : {}),
        ...(image !== undefined ? { image } : {}),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_js_1.user.id, userId))
        .returning();
    res.json({ user: updatedUser });
});
// Register Push Token
exports.profileRouter.post('/push-token', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(profile_js_1.registerPushTokenSchema), async (req, res) => {
    const userId = req.user.id;
    const { token, deviceType } = req.body;
    // Check if token already exists
    const [existing] = await index_js_1.db
        .select()
        .from(schema_js_1.pushTokens)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.pushTokens.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.pushTokens.token, token)));
    if (!existing) {
        await index_js_1.db.insert(schema_js_1.pushTokens).values({
            userId,
            token,
            deviceType,
        });
    }
    res.json({ message: 'Push token registered successfully' });
});
