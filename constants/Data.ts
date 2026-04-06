export interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  isExpense: boolean;
  status: string;
  icon: string;
  date: string;
  ref: string;
}

// Sample data not used - real data comes from database
export const sampleTransactions: Transaction[] = [];
export const progressItems = [];
