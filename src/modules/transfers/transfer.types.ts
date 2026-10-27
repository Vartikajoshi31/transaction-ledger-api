export interface Transfer {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description?: string | null;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_at: string;
}

export interface CreateTransferDTO {
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description?: string;
}

export interface TransferResponse {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description?: string | null;
  source_balance_after: number;
  destination_balance_after: number;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_at: string;
}
