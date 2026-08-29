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

export const useExpenses = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [balances, setBalances] = useState<BalanceData>({
    summary: { youAreOwed: 0, youOwe: 0, netBalance: 0 },
    memberBalances: [],
    simplifiedDebts: [],
  });
  const [members, setMembers] = useState<FlatMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpensesData = useCallback(async () => {
    if (!activeFlat?.id) return;
    try {
      const [expData, balData, memData] = await Promise.all([
        api.get<{ expenses: ExpenseItem[] }>('/api/expenses', { flatId: activeFlat.id }),
        api.get<BalanceData>('/api/expenses/balances', { flatId: activeFlat.id }),
        api.get<{ members: any[] }>(`/api/flats/${activeFlat.id}/members`),
      ]);

      setExpenses(expData.expenses || []);
      setBalances(balData);
      setMembers(
        (memData.members || []).map((m: any) => ({
          userId: m.userId,
          name: m.name,
          image: m.image,
        }))
      );
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFlat?.id]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  const addExpense = async (payload: {
    title: string;
    amount: number;
    category: string;
    splitType: 'equal' | 'exact';
    splits: { userId: string; amountOwed: number }[];
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
    if (!activeFlat?.id) return;
    await api.post('/api/expenses/settle', {
      ...payload,
      flatId: activeFlat.id,
    });
    await fetchExpensesData();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpensesData();
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
    loading,
    refreshing,
    addExpense,
    settleUp,
    onRefresh,
  };
};
