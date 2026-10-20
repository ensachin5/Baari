import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useSession } from '../store/session';
import { ExpenseItem } from '../components/expense/ExpenseRow';
import { FlatMember } from '../components/expense/AddExpenseModal';

export interface BalanceData {
  summary: {
    youAreOwed: number;
    youOwe: number;
    netBalance: number;
  };
  memberBalances: {
    userId: string;
    name: string;
    image?: string | null;
    netBalance: number;
  }[];
  simplifiedDebts: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amount: number;
  }[];
}

export interface PendingSettlement {
  id: string;
  flatId: string;
  paidBy: string;
  paidTo: string;
  amount: string;
  note?: string | null;
  status: string;
  createdAt: string;
  payerName: string;
  payerImage?: string | null;
}

// Global in-memory cache for instant 0ms tab switching
let globalCachedExpenses: ExpenseItem[] = [];
let globalCachedBalances: BalanceData = {
  summary: { youAreOwed: 0, youOwe: 0, netBalance: 0 },
  memberBalances: [],
  simplifiedDebts: [],
};
let globalCachedPending: PendingSettlement[] = [];
let globalCachedMembers: FlatMember[] = [];
let globalCachedExpensesFlatId: string | null = null;
let globalExpensesFetchedAt = 0;

export const useExpenses = () => {
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);

  const hasCache =
    globalCachedExpensesFlatId === activeFlat?.id &&
    (globalCachedExpenses.length > 0 || globalCachedBalances.memberBalances.length > 0);

  const [expenses, setExpenses] = useState<ExpenseItem[]>(hasCache ? globalCachedExpenses : []);
  const [balances, setBalances] = useState<BalanceData>(hasCache ? globalCachedBalances : {
    summary: { youAreOwed: 0, youOwe: 0, netBalance: 0 },
    memberBalances: [],
    simplifiedDebts: [],
  });
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>(hasCache ? globalCachedPending : []);
  const [members, setMembers] = useState<FlatMember[]>(hasCache ? globalCachedMembers : []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(!hasCache);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpensesData = useCallback(async (customSearch?: string, customCategory?: string, isSilent = false) => {
    if (!token || !currentUser || !activeFlat?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!isSilent && globalCachedExpensesFlatId !== activeFlat.id) {
      setLoading(true);
    }
    try {
      const activeSearch = customSearch !== undefined ? customSearch : search;
      const activeCat = customCategory !== undefined ? customCategory : category;

      const params: Record<string, string> = { flatId: activeFlat.id };
      if (activeCat && activeCat !== 'All') params.category = activeCat;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const [expData, balData, memData, pendingData] = await Promise.all([
        api.get<{ expenses: ExpenseItem[] }>('/api/expenses', params),
        api.get<BalanceData>('/api/expenses/balances', { flatId: activeFlat.id }),
        api.get<{ members: any[] }>(`/api/flats/${activeFlat.id}/members`),
        api.get<{ pendingSettlements: PendingSettlement[] }>('/api/expenses/settlements/pending', {
          flatId: activeFlat.id,
        }),
      ]);

      const newExpenses = expData.expenses || [];
      const newPending = pendingData.pendingSettlements || [];
      const newMembers = (memData.members || []).map((m: any) => ({
        userId: m.userId,
        name: m.name,
        image: m.image,
      }));

      // Update global cache only for unfiltered fetch
      if (!activeSearch && (!activeCat || activeCat === 'All')) {
        globalCachedExpenses = newExpenses;
        globalCachedBalances = balData;
        globalCachedPending = newPending;
        globalCachedMembers = newMembers;
        globalCachedExpensesFlatId = activeFlat.id;
        globalExpensesFetchedAt = Date.now();
      }

      setExpenses(newExpenses);
      setBalances(balData);
      setPendingSettlements(newPending);
      setMembers(newMembers);
    } catch (error: any) {
      if (error?.status === 401) return;
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFlat?.id, token, currentUser, search, category]);

  useEffect(() => {
    if (!token || !currentUser || !activeFlat?.id) return;

    const isStale = Date.now() - globalExpensesFetchedAt > 15000;
    const isDifferentFlat = globalCachedExpensesFlatId !== activeFlat.id;

    if (isDifferentFlat || !hasCache) {
      fetchExpensesData(undefined, undefined, false);
    } else if (isStale) {
      fetchExpensesData(undefined, undefined, true);
    }
  }, [fetchExpensesData, token, currentUser, activeFlat?.id]);

  const addExpense = async (payload: {
    title: string;
    amount: number;
    category: string;
    splitType: 'equal' | 'exact';
    splits: { userId: string; amountOwed: number }[];
    isRecurring?: boolean;
    recurrenceInterval?: 'weekly' | 'monthly';
  }) => {
    if (!activeFlat?.id) return;
    await api.post('/api/expenses', {
      ...payload,
      flatId: activeFlat.id,
    });
    await fetchExpensesData();
  };

  const settleUp = async (payload: {
    paidTo: string;
    amount: number;
    note?: string;
  }) => {
    if (!activeFlat?.id || !currentUser?.id) return;
    await api.post('/api/expenses/settlements', {
      ...payload,
      flatId: activeFlat.id,
    });
    await fetchExpensesData();
  };

  const confirmSettlement = async (settlementId: string) => {
    await api.patch(`/api/expenses/settlements/${settlementId}/confirm`);
    await fetchExpensesData();
  };

  const rejectSettlement = async (settlementId: string) => {
    await api.patch(`/api/expenses/settlements/${settlementId}/reject`);
    await fetchExpensesData();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpensesData();
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    fetchExpensesData(text, category);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchExpensesData(search, cat);
  };

  // Debts owed specifically by current user
  const myDebts = balances.simplifiedDebts.filter(
    (d) => d.fromUserId === currentUser?.id
  );

  return {
    expenses,
    balances,
    members,
    myDebts,
    pendingSettlements,
    search,
    category,
    loading,
    refreshing,
    setSearch: handleSearchChange,
    setCategory: handleCategoryChange,
    addExpense,
    settleUp,
    confirmSettlement,
    rejectSettlement,
    onRefresh,
  };
};
