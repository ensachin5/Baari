import { TaskCategory, TaskRecurrence, TaskStatus, FlatMemberRole, SettlementStatus } from '../constants';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface FlatMember {
  id: string;
  flatId: string;
  userId: string;
  role: FlatMemberRole;
  joinedAt: string;
  user: UserProfile;
}

export interface FlatSummary {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  memberCount?: number;
}

export interface TaskOccurrenceMember {
  id: string;
  userId: string;
  status: 'assigned' | 'completed';
  completedAt?: string | null;
  user?: UserProfile;
}

export interface TaskOccurrence {
  id: string;
  taskId: string;
  occurrenceDate: string;
  status: TaskStatus;
  completedAt?: string | null;
  members: TaskOccurrenceMember[];
}

export interface KaamTaskItem {
  id: string;
  flatId: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  recurrence: TaskRecurrence;
  assignmentMode: 'auto_rotate' | 'custom_rotation';
  startDate: string;
  createdAt: string;
  currentOccurrence?: TaskOccurrence | null;
  assignees?: UserProfile[];
  nextAssignee?: UserProfile | null;
}

export interface ExpenseSplitItem {
  id: string;
  expenseId: string;
  userId: string;
  amountOwed: string;
  user?: UserProfile;
}

export interface ExpenseItem {
  id: string;
  flatId: string;
  title: string;
  amount: string;
  category: string;
  date: string;
  paidBy: string;
  receiptUrl?: string | null;
  createdAt: string;
  payer?: UserProfile;
  splits: ExpenseSplitItem[];
}

export interface SettlementItem {
  id: string;
  flatId: string;
  paidBy: string;
  paidTo: string;
  amount: string;
  status: SettlementStatus;
  note?: string | null;
  paymentProofUrl?: string | null;
  createdAt: string;
  payer?: UserProfile;
  receiver?: UserProfile;
}

export interface ChatMessageItem {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
  senderName?: string;
  senderImage?: string | null;
}
