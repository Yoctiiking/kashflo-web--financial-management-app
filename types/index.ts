export type TransactionType = "expense" | "income";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type BudgetPeriod = "monthly" | "weekly" | "daily";

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  label: string;
  date: Date;
  addedBy: string;
  recurrenceId?: string;
  createdAt: Date;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: BudgetPeriod;
  createdAt: Date;
}

export interface Recurrence {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  label: string;
  frequency: RecurrenceFrequency;
  nextOccurrence: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  currency: string;
  createdAt: Date;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  groupId: string;
  createdAt: Date;
}