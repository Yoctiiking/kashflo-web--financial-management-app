import { Budget, Transaction } from "@/types";

export const getBudgetTransactions = (transactions: Transaction[], budget: Budget): Transaction[] => {
  return transactions.filter(t => {
    if (t.type !== "expense" || t.category !== budget.category) return false;

    if (budget.period === "daily") {
      const today = new Date();
      return (
        t.date.getDate() === today.getDate() &&
        t.date.getMonth() === today.getMonth() &&
        t.date.getFullYear() === today.getFullYear()
      );
    }

    if (budget.period === "weekly") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return t.date >= startOfWeek;
    }

    return true;
  });
};

export const getBudgetSpent = (transactions: Transaction[], budget: Budget): number =>
  getBudgetTransactions(transactions, budget).reduce((sum, t) => sum + t.amount, 0);
