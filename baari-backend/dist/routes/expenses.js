"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRouter = void 0;
exports.createNextRecurringInstance = createNextRecurringInstance;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const expenses_js_1 = require("../schemas/expenses.js");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_2 = require("../sockets/index.js");
const handlers_js_1 = require("../sockets/handlers.js");
const push_js_1 = require("../services/push.js");
exports.expensesRouter = (0, express_1.Router)();
// Helper: Calculate Balances and Simplified Debts
async function calculateBalances(flatId, currentUserId) {
    // 1. Get all flat members
    const members = await index_js_1.db
        .select({
        id: schema_js_1.user.id,
        name: schema_js_1.user.name,
        email: schema_js_1.user.email,
        image: schema_js_1.user.image,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId));
    const netBalances = new Map();
    members.forEach((m) => netBalances.set(m.id, 0));
    // 2. Add all amounts paid by members
    const flatExpenses = await index_js_1.db
        .select({
        id: schema_js_1.expenses.id,
        amount: schema_js_1.expenses.amount,
        paidBy: schema_js_1.expenses.paidBy,
    })
        .from(schema_js_1.expenses)
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenses.flatId, flatId));
    flatExpenses.forEach((exp) => {
        const paid = parseFloat(exp.amount);
        const curr = netBalances.get(exp.paidBy) || 0;
        netBalances.set(exp.paidBy, curr + paid);
    });
    // 3. Subtract all splits owed by members
    const flatSplits = await index_js_1.db
        .select({
        userId: schema_js_1.expenseSplits.userId,
        amountOwed: schema_js_1.expenseSplits.amountOwed,
    })
        .from(schema_js_1.expenseSplits)
        .innerJoin(schema_js_1.expenses, (0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.expenseId, schema_js_1.expenses.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenses.flatId, flatId));
    flatSplits.forEach((sp) => {
        const owed = parseFloat(sp.amountOwed);
        const curr = netBalances.get(sp.userId) || 0;
        netBalances.set(sp.userId, curr - owed);
    });
    // 4. Adjust for confirmed settlements only
    const flatSettlements = await index_js_1.db
        .select({
        paidBy: schema_js_1.settlements.paidBy,
        paidTo: schema_js_1.settlements.paidTo,
        amount: schema_js_1.settlements.amount,
    })
        .from(schema_js_1.settlements)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.settlements.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.settlements.status, 'confirmed')));
    flatSettlements.forEach((st) => {
        const amt = parseFloat(st.amount);
        netBalances.set(st.paidBy, (netBalances.get(st.paidBy) || 0) + amt);
        netBalances.set(st.paidTo, (netBalances.get(st.paidTo) || 0) - amt);
    });
    const memberBalances = members.map((m) => {
        const net = Math.round((netBalances.get(m.id) || 0) * 100) / 100;
        return {
            userId: m.id,
            name: m.name,
            image: m.image,
            netBalance: net,
        };
    });
    const debtors = [];
    const creditors = [];
    memberBalances.forEach((m) => {
        if (m.netBalance < -0.01) {
            debtors.push({ id: m.userId, name: m.name, amount: -m.netBalance });
        }
        else if (m.netBalance > 0.01) {
            creditors.push({ id: m.userId, name: m.name, amount: m.netBalance });
        }
    });
    const simplifiedDebts = [];
    let dIdx = 0;
    let cIdx = 0;
    const debtorsCopy = debtors.map((d) => ({ ...d }));
    const creditorsCopy = creditors.map((c) => ({ ...c }));
    while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
        const debtor = debtorsCopy[dIdx];
        const creditor = creditorsCopy[cIdx];
        const settleAmt = Math.min(debtor.amount, creditor.amount);
        if (settleAmt > 0.01) {
            simplifiedDebts.push({
                fromUserId: debtor.id,
                fromUserName: debtor.name,
                toUserId: creditor.id,
                toUserName: creditor.name,
                amount: Math.round(settleAmt * 100) / 100,
            });
        }
        debtor.amount -= settleAmt;
        creditor.amount -= settleAmt;
        if (debtor.amount <= 0.01)
            dIdx++;
        if (creditor.amount <= 0.01)
            cIdx++;
    }
    const currentUserNet = netBalances.get(currentUserId) || 0;
    const youAreOwed = currentUserNet > 0 ? Math.round(currentUserNet * 100) / 100 : 0;
    const youOwe = currentUserNet < 0 ? Math.round(-currentUserNet * 100) / 100 : 0;
    return {
        summary: {
            youAreOwed,
            youOwe,
            netBalance: Math.round(currentUserNet * 100) / 100,
        },
        memberBalances,
        simplifiedDebts,
    };
}
// GET /api/expenses/balances/simplified?flatId=
exports.expensesRouter.get('/balances/simplified', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const currentUserId = req.user.id;
    if (!flatId) {
        res.status(400).json({ error: 'flatId is required' });
        return;
    }
    const { summary, simplifiedDebts } = await calculateBalances(flatId, currentUserId);
    res.json({ summary, simplifiedDebts });
});
// GET /api/expenses/balances?flatId=
exports.expensesRouter.get('/balances', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const currentUserId = req.user.id;
    if (!flatId) {
        res.status(400).json({ error: 'flatId is required' });
        return;
    }
    const result = await calculateBalances(flatId, currentUserId);
    res.json(result);
});
// GET /api/expenses?flatId=&category=&search=
exports.expensesRouter.get('/', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const category = req.query.category;
    const search = req.query.search;
    if (!flatId) {
        res.status(400).json({ error: 'flatId query param is required' });
        return;
    }
    const conditions = [(0, drizzle_orm_1.eq)(schema_js_1.expenses.flatId, flatId)];
    if (category && category !== 'All') {
        conditions.push((0, drizzle_orm_1.eq)(schema_js_1.expenses.category, category));
    }
    if (search && search.trim()) {
        conditions.push((0, drizzle_orm_1.ilike)(schema_js_1.expenses.title, `%${search.trim()}%`));
    }
    const flatExpenses = await index_js_1.db
        .select({
        id: schema_js_1.expenses.id,
        flatId: schema_js_1.expenses.flatId,
        title: schema_js_1.expenses.title,
        amount: schema_js_1.expenses.amount,
        paidBy: schema_js_1.expenses.paidBy,
        category: schema_js_1.expenses.category,
        isRecurring: schema_js_1.expenses.isRecurring,
        recurrenceInterval: schema_js_1.expenses.recurrenceInterval,
        isEdited: schema_js_1.expenses.isEdited,
        editedAt: schema_js_1.expenses.editedAt,
        createdAt: schema_js_1.expenses.createdAt,
        payerName: schema_js_1.user.name,
        payerImage: schema_js_1.user.image,
    })
        .from(schema_js_1.expenses)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.expenses.paidBy, schema_js_1.user.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.expenses.createdAt));
    if (flatExpenses.length === 0) {
        res.json({ expenses: [] });
        return;
    }
    const expenseIds = flatExpenses.map((e) => e.id);
    // Fetch splits
    const splits = await index_js_1.db
        .select({
        id: schema_js_1.expenseSplits.id,
        expenseId: schema_js_1.expenseSplits.expenseId,
        userId: schema_js_1.expenseSplits.userId,
        amountOwed: schema_js_1.expenseSplits.amountOwed,
        isSettled: schema_js_1.expenseSplits.isSettled,
        userName: schema_js_1.user.name,
        userImage: schema_js_1.user.image,
    })
        .from(schema_js_1.expenseSplits)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.inArray)(schema_js_1.expenseSplits.expenseId, expenseIds));
    const splitsByExpenseId = new Map();
    splits.forEach((s) => {
        const list = splitsByExpenseId.get(s.expenseId) || [];
        list.push(s);
        splitsByExpenseId.set(s.expenseId, list);
    });
    const enrichedExpenses = flatExpenses.map((exp) => ({
        ...exp,
        splits: splitsByExpenseId.get(exp.id) || [],
    }));
    res.json({ expenses: enrichedExpenses });
});
// POST /api/expenses
exports.expensesRouter.post('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(expenses_js_1.createExpenseSchema), async (req, res) => {
    const { flatId, title, amount, category, splitType, splits, isRecurring, recurrenceInterval } = req.body;
    const userId = req.user.id;
    // 1. Insert expense
    const [newExpense] = await index_js_1.db
        .insert(schema_js_1.expenses)
        .values({
        flatId,
        title,
        amount: amount.toString(),
        paidBy: userId,
        category: category || 'General',
        isRecurring: isRecurring || false,
        recurrenceInterval: recurrenceInterval || null,
    })
        .returning();
    // 2. Insert splits
    let splitRecords = [];
    if (splitType === 'equal') {
        const perPerson = (amount / splits.length).toFixed(2);
        splitRecords = splits.map((s) => ({
            expenseId: newExpense.id,
            userId: s.userId,
            amountOwed: perPerson,
        }));
    }
    else {
        splitRecords = splits.map((s) => ({
            expenseId: newExpense.id,
            userId: s.userId,
            amountOwed: s.amountOwed.toFixed(2),
        }));
    }
    await index_js_1.db.insert(schema_js_1.expenseSplits).values(splitRecords);
    // 3. Log activity
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId,
        actorId: userId,
        type: 'expense_added',
        referenceId: newExpense.id,
        metadata: {
            title: newExpense.title,
            amount: newExpense.amount,
            category: newExpense.category,
        },
    })
        .returning();
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    // Send push notification
    const participantUserIds = splits
        .map((s) => s.userId)
        .filter((id) => id !== userId);
    if (participantUserIds.length > 0) {
        (0, push_js_1.sendPushNotification)(participantUserIds, {
            title: 'New Expense Added',
            body: `${req.user.name} added an expense: ${newExpense.title} (₹${newExpense.amount})`,
            data: { type: 'expense', expenseId: newExpense.id },
        });
    }
    res.status(201).json({
        expense: newExpense,
        splits: splitRecords,
    });
});
// PATCH /api/expenses/:id (Edit title/amount/split - creator or flat admin only)
exports.expensesRouter.patch('/:id', auth_guard_js_1.requireAuth, async (req, res) => {
    const expenseId = String(req.params.id);
    const userId = req.user.id;
    const { title, amount, category, splits } = req.body;
    const [existing] = await index_js_1.db.select().from(schema_js_1.expenses).where((0, drizzle_orm_1.eq)(schema_js_1.expenses.id, expenseId));
    if (!existing) {
        res.status(404).json({ error: 'Expense not found' });
        return;
    }
    // Check if creator or admin
    const [membership] = await index_js_1.db
        .select({ role: schema_js_1.flatMembers.role })
        .from(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, existing.flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, userId)));
    const isCreator = existing.paidBy === userId;
    const isAdmin = membership?.role === 'admin';
    if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Only the creator or a flat admin can edit this expense' });
        return;
    }
    const updateFields = {
        isEdited: true,
        editedAt: new Date(),
    };
    if (title)
        updateFields.title = title;
    if (amount)
        updateFields.amount = amount.toString();
    if (category)
        updateFields.category = category;
    const [updatedExpense] = await index_js_1.db
        .update(schema_js_1.expenses)
        .set(updateFields)
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenses.id, expenseId))
        .returning();
    // If new splits provided, replace
    if (splits && Array.isArray(splits)) {
        await index_js_1.db.delete(schema_js_1.expenseSplits).where((0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.expenseId, expenseId));
        const splitRecords = splits.map((s) => ({
            expenseId,
            userId: s.userId,
            amountOwed: s.amountOwed.toFixed(2),
        }));
        await index_js_1.db.insert(schema_js_1.expenseSplits).values(splitRecords);
    }
    res.json({ expense: updatedExpense });
});
// GET /api/expenses/:id/comments
exports.expensesRouter.get('/:id/comments', auth_guard_js_1.requireAuth, async (req, res) => {
    const expenseId = String(req.params.id);
    const comments = await index_js_1.db
        .select({
        id: schema_js_1.expenseComments.id,
        expenseId: schema_js_1.expenseComments.expenseId,
        userId: schema_js_1.expenseComments.userId,
        content: schema_js_1.expenseComments.content,
        createdAt: schema_js_1.expenseComments.createdAt,
        userName: schema_js_1.user.name,
        userImage: schema_js_1.user.image,
    })
        .from(schema_js_1.expenseComments)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.expenseComments.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenseComments.expenseId, expenseId))
        .orderBy((0, drizzle_orm_1.asc)(schema_js_1.expenseComments.createdAt));
    res.json({ comments });
});
// POST /api/expenses/:id/comments
exports.expensesRouter.post('/:id/comments', auth_guard_js_1.requireAuth, async (req, res) => {
    const expenseId = String(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || !String(content).trim()) {
        res.status(400).json({ error: 'Comment content cannot be empty' });
        return;
    }
    const [newComment] = await index_js_1.db
        .insert(schema_js_1.expenseComments)
        .values({
        expenseId,
        userId,
        content: String(content).trim(),
    })
        .returning();
    const [commentWithUser] = await index_js_1.db
        .select({
        id: schema_js_1.expenseComments.id,
        expenseId: schema_js_1.expenseComments.expenseId,
        userId: schema_js_1.expenseComments.userId,
        content: schema_js_1.expenseComments.content,
        createdAt: schema_js_1.expenseComments.createdAt,
        userName: schema_js_1.user.name,
        userImage: schema_js_1.user.image,
    })
        .from(schema_js_1.expenseComments)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.expenseComments.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenseComments.id, newComment.id));
    res.status(201).json({ comment: commentWithUser });
});
// POST /api/expenses/:id/remind (Push notification nudge)
exports.expensesRouter.post('/:id/remind', auth_guard_js_1.requireAuth, async (req, res) => {
    const expenseId = String(req.params.id);
    const userId = req.user.id;
    const { targetUserId } = req.body || {};
    const [expense] = await index_js_1.db.select().from(schema_js_1.expenses).where((0, drizzle_orm_1.eq)(schema_js_1.expenses.id, expenseId));
    if (!expense) {
        res.status(404).json({ error: 'Expense not found' });
        return;
    }
    // Get unsettled splits
    const unsettled = await index_js_1.db
        .select({
        userId: schema_js_1.expenseSplits.userId,
        amountOwed: schema_js_1.expenseSplits.amountOwed,
    })
        .from(schema_js_1.expenseSplits)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.expenseId, expenseId), (0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.isSettled, false)));
    const debtorsToRemind = unsettled
        .filter((u) => u.userId !== userId)
        .filter((u) => (targetUserId ? u.userId === targetUserId : true));
    if (debtorsToRemind.length > 0) {
        const recipientIds = debtorsToRemind.map((d) => d.userId);
        (0, push_js_1.sendPushNotification)(recipientIds, {
            title: 'Expense Reminder 💸',
            body: `${req.user.name} sent a reminder for "${expense.title}"`,
            data: { type: 'expense', expenseId },
        });
    }
    res.json({
        message: 'Reminder sent',
        remindedCount: debtorsToRemind.length,
    });
});
// GET /api/settlements/pending?flatId= (Pending settlements for recipient)
exports.expensesRouter.get('/settlements/pending', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const userId = req.user.id;
    if (!flatId) {
        res.status(400).json({ error: 'flatId is required' });
        return;
    }
    const pending = await index_js_1.db
        .select({
        id: schema_js_1.settlements.id,
        flatId: schema_js_1.settlements.flatId,
        paidBy: schema_js_1.settlements.paidBy,
        paidTo: schema_js_1.settlements.paidTo,
        amount: schema_js_1.settlements.amount,
        note: schema_js_1.settlements.note,
        status: schema_js_1.settlements.status,
        createdAt: schema_js_1.settlements.createdAt,
        payerName: schema_js_1.user.name,
        payerImage: schema_js_1.user.image,
    })
        .from(schema_js_1.settlements)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.settlements.paidBy, schema_js_1.user.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.settlements.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.settlements.paidTo, userId), (0, drizzle_orm_1.eq)(schema_js_1.settlements.status, 'pending')))
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.settlements.createdAt));
    res.json({ pendingSettlements: pending });
});
// POST /api/settlements (Create settlement - defaults to status: pending)
exports.expensesRouter.post(['/settle', '/settlements'], auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(expenses_js_1.createSettlementSchema), async (req, res) => {
    const { flatId, paidTo, amount, note } = req.body;
    const paidBy = req.user.id;
    // Insert settlement as pending
    const [newSettlement] = await index_js_1.db
        .insert(schema_js_1.settlements)
        .values({
        flatId,
        paidBy,
        paidTo,
        amount: amount.toString(),
        note,
        status: 'pending',
    })
        .returning();
    // Get payee details
    const [payee] = await index_js_1.db.select({ name: schema_js_1.user.name }).from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, paidTo));
    // Send push notification to recipient to confirm
    (0, push_js_1.sendPushNotification)([paidTo], {
        title: 'Settlement Payment Sent',
        body: `${req.user.name} sent you ₹${amount}. Tap to confirm receipt.`,
        data: { type: 'settlement', settlementId: newSettlement.id },
    });
    res.status(201).json({
        settlement: newSettlement,
        message: 'Settlement recorded and pending confirmation from recipient',
    });
});
// PATCH /api/settlements/:id/confirm (Recipient confirms settlement)
exports.expensesRouter.patch('/settlements/:id/confirm', auth_guard_js_1.requireAuth, async (req, res) => {
    const settlementId = String(req.params.id);
    const userId = req.user.id;
    const [st] = await index_js_1.db.select().from(schema_js_1.settlements).where((0, drizzle_orm_1.eq)(schema_js_1.settlements.id, settlementId));
    if (!st) {
        res.status(404).json({ error: 'Settlement not found' });
        return;
    }
    if (st.paidTo !== userId) {
        res.status(403).json({ error: 'Only the recipient can confirm this settlement' });
        return;
    }
    const [confirmed] = await index_js_1.db
        .update(schema_js_1.settlements)
        .set({
        status: 'confirmed',
        confirmedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_js_1.settlements.id, settlementId))
        .returning();
    // Log activity
    const [payer] = await index_js_1.db.select({ name: schema_js_1.user.name }).from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, st.paidBy));
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId: st.flatId,
        actorId: userId,
        type: 'settlement_confirmed',
        referenceId: confirmed.id,
        metadata: {
            amount: confirmed.amount,
            paidByName: payer?.name || 'Flatmate',
            confirmedByName: req.user.name,
        },
    })
        .returning();
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, st.flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
        io.to(`flat:${st.flatId}`).emit('balance_updated', { flatId: st.flatId });
    }
    catch (_) { }
    (0, push_js_1.sendPushNotification)([st.paidBy], {
        title: 'Settlement Confirmed! ✅',
        body: `${req.user.name} confirmed receiving your payment of ₹${st.amount}`,
        data: { type: 'settlement', settlementId },
    });
    res.json({ message: 'Settlement confirmed', settlement: confirmed });
});
// PATCH /api/settlements/:id/reject (Recipient rejects settlement)
exports.expensesRouter.patch('/settlements/:id/reject', auth_guard_js_1.requireAuth, async (req, res) => {
    const settlementId = String(req.params.id);
    const userId = req.user.id;
    const [st] = await index_js_1.db.select().from(schema_js_1.settlements).where((0, drizzle_orm_1.eq)(schema_js_1.settlements.id, settlementId));
    if (!st) {
        res.status(404).json({ error: 'Settlement not found' });
        return;
    }
    if (st.paidTo !== userId) {
        res.status(403).json({ error: 'Only the recipient can reject this settlement' });
        return;
    }
    const [rejected] = await index_js_1.db
        .update(schema_js_1.settlements)
        .set({ status: 'rejected' })
        .where((0, drizzle_orm_1.eq)(schema_js_1.settlements.id, settlementId))
        .returning();
    (0, push_js_1.sendPushNotification)([st.paidBy], {
        title: 'Settlement Rejected ❌',
        body: `${req.user.name} could not confirm receiving your payment of ₹${st.amount}`,
        data: { type: 'settlement', settlementId },
    });
    res.json({ message: 'Settlement rejected', settlement: rejected });
});
// Helper function: createNextRecurringInstance
async function createNextRecurringInstance(expenseId) {
    const [parent] = await index_js_1.db.select().from(schema_js_1.expenses).where((0, drizzle_orm_1.eq)(schema_js_1.expenses.id, expenseId));
    if (!parent || !parent.isRecurring || !parent.recurrenceInterval)
        return null;
    const parentSplits = await index_js_1.db
        .select()
        .from(schema_js_1.expenseSplits)
        .where((0, drizzle_orm_1.eq)(schema_js_1.expenseSplits.expenseId, expenseId));
    const [childExpense] = await index_js_1.db
        .insert(schema_js_1.expenses)
        .values({
        flatId: parent.flatId,
        title: parent.title,
        amount: parent.amount,
        paidBy: parent.paidBy,
        category: parent.category,
        isRecurring: true,
        recurrenceInterval: parent.recurrenceInterval,
        parentExpenseId: parent.id,
    })
        .returning();
    if (parentSplits.length > 0) {
        const childSplits = parentSplits.map((ps) => ({
            expenseId: childExpense.id,
            userId: ps.userId,
            amountOwed: ps.amountOwed,
            isSettled: false,
        }));
        await index_js_1.db.insert(schema_js_1.expenseSplits).values(childSplits);
    }
    return childExpense;
}
