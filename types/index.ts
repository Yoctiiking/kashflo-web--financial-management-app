export type TransactionType = "expense" | "income";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type BudgetPeriod = "daily" | "weekly" | "monthly";

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
  originalAmount?: number;
  originalCurrency?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: BudgetPeriod;
  createdAt: Date;
  originalAmount?: number;
  originalCurrency?: string;
}

export interface Recurrence {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  label: string;
  frequency: RecurrenceFrequency;
  customDays?: number;
  nextOccurrence: Date;
  isActive: boolean;
  createdAt: Date;
  originalAmount?: number;
  originalCurrency?: string;
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
  currency: string;
  language: string;
  createdAt: Date;
  onboardingVersion?: number;
  expenseCategories: string[];
  incomeCategories: string[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  createdAt: Date;
  originalTargetAmount?: number;
  originalTargetCurrency?: string;
  originalCurrentAmount?: number;
  originalCurrentCurrency?: string;
}

export interface SharedBudget {
  id: string;
  name: string;
  limit: number;
  period: BudgetPeriod;
  category: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  originalAmount?: number;
  originalCurrency?: string;
}

export interface SharedExpense {
  id: string;
  amount: number;
  label: string;
  date: Date;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
  originalAmount?: number;
  originalCurrency?: string;
}