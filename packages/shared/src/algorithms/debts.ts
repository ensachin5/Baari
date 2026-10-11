export interface MemberNetBalance {
  userId: string;
  name: string;
  image?: string | null;
  netBalance: number;
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export function simplifyDebts(memberBalances: MemberNetBalance[]): SimplifiedDebt[] {
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  memberBalances.forEach((m) => {
    if (m.netBalance < -0.01) {
      debtors.push({ id: m.userId, name: m.name, amount: -m.netBalance });
    } else if (m.netBalance > 0.01) {
      creditors.push({ id: m.userId, name: m.name, amount: m.netBalance });
    }
  });

  const simplifiedDebts: SimplifiedDebt[] = [];
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

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return simplifiedDebts;
}
