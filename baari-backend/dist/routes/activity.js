"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const drizzle_orm_1 = require("drizzle-orm");
exports.activityRouter = (0, express_1.Router)();
// Get paginated activity feed for a flat
exports.activityRouter.get('/', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit, 10) || 20;
    if (!flatId) {
        res.status(400).json({ error: 'flatId query param is required' });
        return;
    }
    let conditions = (0, drizzle_orm_1.eq)(schema_js_1.activityLog.flatId, flatId);
    if (cursor) {
        const cursorDate = new Date(cursor);
        conditions = (0, drizzle_orm_1.and)(conditions, (0, drizzle_orm_1.lt)(schema_js_1.activityLog.createdAt, cursorDate));
    }
    const entries = await index_js_1.db
        .select({
        id: schema_js_1.activityLog.id,
        flatId: schema_js_1.activityLog.flatId,
        actorId: schema_js_1.activityLog.actorId,
        type: schema_js_1.activityLog.type,
        referenceId: schema_js_1.activityLog.referenceId,
        metadata: schema_js_1.activityLog.metadata,
        createdAt: schema_js_1.activityLog.createdAt,
        actorName: schema_js_1.user.name,
        actorImage: schema_js_1.user.image,
    })
        .from(schema_js_1.activityLog)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.activityLog.actorId, schema_js_1.user.id))
        .where(conditions)
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.activityLog.createdAt))
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
