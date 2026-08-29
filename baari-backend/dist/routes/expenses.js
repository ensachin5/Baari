"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const expenses_js_1 = require("../schemas/expenses.js");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_2 = require("../sockets/index.js");
const handlers_js_1 = require("../sockets/handlers.js");
exports.expensesRouter = (0, express_1.Router)();
// Get expenses for a flat
exports.expensesRouter.get('/', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const category = req.query.category;
    if (!flatId) {
        res.status(400).json({ error: 'flatId query param is required' });
        return;
    }
    const queryConditions = category
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.expenses.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.expenses.category, category))
        : (0, drizzle_orm_1.eq)(schema_js_1.expenses.flatId, flatId);
    const flatExpenses = await index_js_1.db
        .select({
        id: schema_js_1.expenses.id,
        flatId: schema_js_1.expenses.flatId,
        title: schema_js_1.expenses.title,
        amount: schema_js_1.expenses.amount,
        paidBy: schema_js_1.expenses.paidBy,
        category: schema_js_1.expenses.category,
        createdAt: schema_js_1.expenses.createdAt,
        payerName: schema_js_1.user.name,
        payerImage: schema_js_1.user.image,
    })
        .from(schema_js_1.expenses)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.expenses.paidBy, schema_js_1.user.id))
        .where(queryConditions)
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
// Add an expense
exports.expensesRouter.post('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(expenses_js_1.createExpenseSchema), async (req, res) => {
    const { flatId, title, amount, category, splitType, splits } = req.body;
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
    })
        .returning();
    // 2. Insert calculated splits
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
    res.status(201).json({
        expense: newExpense,
        splits: splitRecords,
    });
});
// Get balances and debts summary
exports.expensesRouter.get('/balances', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    const currentUserId = req.user.id;
    if (!flatId) {
        res.status(400).json({ error: 'flatId is required' });
        return;
    }
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
    // Initialize net balance map (userId -> net amount in rupees)
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
    // 4. Adjust for settlements
    const flatSettlements = await index_js_1.db
        .select({
        paidBy: schema_js_1.settlements.paidBy,
        paidTo: schema_js_1.settlements.paidTo,
        amount: schema_js_1.settlements.amount,
    })
        .from(schema_js_1.settlements)
        .where((0, drizzle_orm_1.eq)(schema_js_1.settlements.flatId, flatId));
    flatSettlements.forEach((st) => {
        const amt = parseFloat(st.amount);
        // Payer sent money -> increases their net balance
        netBalances.set(st.paidBy, (netBalances.get(st.paidBy) || 0) + amt);
        // Payee received money -> decreases their net balance
        netBalances.set(st.paidTo, (netBalances.get(st.paidTo) || 0) - amt);
    });
    // Build member balance list
    const memberBalances = members.map((m) => {
        const net = Math.round((netBalances.get(m.id) || 0) * 100) / 100;
        return {
            userId: m.id,
            name: m.name,
            image: m.image,
            netBalance: net,
        };
    });
    // Compute pairwise simplified debts
    // Debtors have net < 0, Creditors have net > 0
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
    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];
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
    // Current user's summary
    const currentUserNet = netBalances.get(currentUserId) || 0;
    const youAreOwed = currentUserNet > 0 ? Math.round(currentUserNet * 100) / 100 : 0;
    const youOwe = currentUserNet < 0 ? Math.round(-currentUserNet * 100) / 100 : 0;
    res.json({
        summary: {
            youAreOwed,
            youOwe,
            netBalance: Math.round(currentUserNet * 100) / 100,
        },
        memberBalances,
        simplifiedDebts,
    });
});
// Record a settlement
exports.expensesRouter.post('/settle', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(expenses_js_1.createSettlementSchema), async (req, res) => {
    const { flatId, paidTo, amount, note } = req.body;
    const paidBy = req.user.id;
    // Insert settlement
    const [newSettlement] = await index_js_1.db
        .insert(schema_js_1.settlements)
        .values({
        flatId,
        paidBy,
        paidTo,
        amount: amount.toString(),
        note,
    })
        .returning();
    // Get payee details for activity log
    const [payee] = await index_js_1.db.select({ name: schema_js_1.user.name }).from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, paidTo));
    // Log activity
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId,
        actorId: paidBy,
        type: 'settlement',
        referenceId: newSettlement.id,
        metadata: {
            amount: newSettlement.amount,
            paidToName: payee?.name || 'Flatmate',
            note,
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
    res.status(201).json({ settlement: newSettlement });
});
