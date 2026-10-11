export const TASK_CATEGORIES = ['water', 'garbage', 'chore', 'custom'] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_RECURRENCES = ['once', 'daily', 'weekly', 'custom'] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'done', 'missed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const FLAT_MEMBER_ROLES = ['admin', 'member'] as const;
export type FlatMemberRole = (typeof FLAT_MEMBER_ROLES)[number];

export const SETTLEMENT_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const DEFAULT_QUICK_PICKS = [
  { label: 'Water', title: 'Water Tank Refill', category: 'water' as const, icon: 'Droplet', sortOrder: 0 },
  { label: 'Trash', title: 'Trash', category: 'garbage' as const, icon: 'Trash2', sortOrder: 1 },
  { label: 'Sweeping', title: 'Sweeping', category: 'chore' as const, icon: 'Wind', sortOrder: 2 },
  { label: 'Bathroom', title: 'Bathroom', category: 'chore' as const, icon: 'Bath', sortOrder: 3 },
  { label: 'Dishes', title: 'Dishes', category: 'chore' as const, icon: 'UtensilsCrossed', sortOrder: 4 },
  { label: 'Laundry', title: 'Laundry', category: 'chore' as const, icon: 'Shirt', sortOrder: 5 },
  { label: 'Groceries', title: 'Groceries', category: 'custom' as const, icon: 'ShoppingCart', sortOrder: 6 },
];
