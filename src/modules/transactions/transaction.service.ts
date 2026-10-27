import {
  CreateTransactionDTO,
  PaginatedTransactionsResponse,
  Transaction,
  TransactionFilterQuery,
} from './transaction.types.js';
import {
  transactionRepository,
  TransactionRepository,
} from './transaction.repository.js';
import { accountRepository, AccountRepository } from '../accounts/account.repository.js';
import { AccountNotFoundError } from '../../errors/AppError.js';

export class TransactionService {
  constructor(
    private repo: TransactionRepository = transactionRepository,
    private accountRepo: AccountRepository = accountRepository
  ) {}

  addTransaction(dto: CreateTransactionDTO): Transaction {
    // Check if account exists before proceeding
    const account = this.accountRepo.findById(dto.account_id);
    if (!account) {
      throw new AccountNotFoundError(dto.account_id);
    }

    return this.repo.createAtomic(dto);
  }

  getTransactions(
    accountId: string,
    filter: TransactionFilterQuery
  ): PaginatedTransactionsResponse {
    // Validate account exists
    const account = this.accountRepo.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    return this.repo.getTransactions(accountId, filter);
  }
}

export const transactionService = new TransactionService();
