export type TransactionType = 'credit' | 'debit';

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description?: string | null;
  reference_id: string;
  created_at: string;
}

export interface CreateTransactionDTO {
  account_id: string;
  type: TransactionType;
  amount: number;
  reference_id: string;
  description?: string;
}

export interface TransactionFilterQuery {
  type?: TransactionType;
  page?: number;
  limit?: number;
}

export interface PaginatedTransactionsResponse {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  transactions: Transaction[];
  data: Transaction[];
}
