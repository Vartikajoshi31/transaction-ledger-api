import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection.js';
import {
  Transaction,
  CreateTransactionDTO,
  TransactionFilterQuery,
  PaginatedTransactionsResponse,
} from './transaction.types.js';
import {
  AccountNotFoundError,
  DuplicateTransactionError,
  InsufficientBalanceError,
} from '../../errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

export class TransactionRepository {
  private get db(): Database {
    return getDatabase();
  }

  /**
   * Atomically executes transaction creation and account balance update.
   * If any step fails or an exception is thrown, the transaction is fully rolled back.
   */
  createAtomic(dto: CreateTransactionDTO): Transaction {
    const tx = this.db.transaction(() => {
      // 1. Fetch current account state
      const accountStmt = this.db.prepare(
        'SELECT id, balance FROM accounts WHERE id = ?'
      );
      const account = accountStmt.get(dto.account_id) as
        | { id: string; balance: number }
        | undefined;

      if (!account) {
        throw new AccountNotFoundError(dto.account_id);
      }

      // 2. Check for duplicate reference_id for this account
      const duplicateStmt = this.db.prepare(
        'SELECT id FROM transactions WHERE account_id = ? AND reference_id = ?'
      );
      const existingTx = duplicateStmt.get(dto.account_id, dto.reference_id);
      if (existingTx) {
        throw new DuplicateTransactionError(dto.account_id, dto.reference_id);
      }

      // 3. Compute new balance based on transaction type
      let newBalance: number;
      if (dto.type === 'credit') {
        newBalance = Math.round((account.balance + dto.amount) * 100) / 100;
      } else {
        if (account.balance < dto.amount) {
          throw new InsufficientBalanceError(account.balance, dto.amount);
        }
        newBalance = Math.round((account.balance - dto.amount) * 100) / 100;
      }

      // 4. Update account balance
      const updateStmt = this.db.prepare(
        'UPDATE accounts SET balance = ? WHERE id = ?'
      );
      updateStmt.run(newBalance, dto.account_id);

      // 5. Insert transaction record
      const transactionRecord: Transaction = {
        id: uuidv4(),
        account_id: dto.account_id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description || null,
        reference_id: dto.reference_id,
        created_at: new Date().toISOString(),
      };

      const insertStmt = this.db.prepare(`
        INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(
        transactionRecord.id,
        transactionRecord.account_id,
        transactionRecord.type,
        transactionRecord.amount,
        transactionRecord.description,
        transactionRecord.reference_id,
        transactionRecord.created_at
      );

      return transactionRecord;
    });

    return tx();
  }

  /**
   * Retrieves paginated transaction history for an account with optional type filtering,
   * sorted in latest-first order based on created_at.
   */
  getTransactions(
    accountId: string,
    filter: TransactionFilterQuery
  ): PaginatedTransactionsResponse {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE account_id = ?';
    let dataQuery = `
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ?
    `;
    const params: unknown[] = [accountId];

    if (filter.type) {
      countQuery += ' AND type = ?';
      dataQuery += ' AND type = ?';
      params.push(filter.type);
    }

    dataQuery += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';

    const countStmt = this.db.prepare(countQuery);
    const countResult = (filter.type
      ? countStmt.get(accountId, filter.type)
      : countStmt.get(accountId)) as { total: number };
    const totalRecords = countResult ? countResult.total : 0;
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    const dataStmt = this.db.prepare(dataQuery);
    const rows = (
      filter.type
        ? dataStmt.all(accountId, filter.type, limit, offset)
        : dataStmt.all(accountId, limit, offset)
    ) as Transaction[];

    return {
      page,
      limit,
      total_records: totalRecords,
      total_pages: totalPages,
      transactions: rows,
      data: rows,
    };
  }

  findById(id: string): Transaction | null {
    const stmt = this.db.prepare(`
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE id = ?
    `);
    const row = stmt.get(id) as Transaction | undefined;
    return row || null;
  }
}

export const transactionRepository = new TransactionRepository();
