import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection.js';
import { CreateTransferDTO, TransferResponse } from './transfer.types.js';
import {
  AccountNotFoundError,
  DuplicateTransactionError,
  InsufficientBalanceError,
  BadRequestError,
} from '../../errors/AppError.js';
import { ErrorCodes } from '../../errors/errorCodes.js';
import { v4 as uuidv4 } from 'uuid';

export class TransferRepository {
  private get db(): Database {
    return getDatabase();
  }

  /**
   * Executes atomic transfer between two accounts with strict rollback guarantees.
   */
  transferAtomic(dto: CreateTransferDTO): TransferResponse {
    if (dto.source_account_id === dto.destination_account_id) {
      throw new BadRequestError(
        'Source and destination accounts must be different',
        ErrorCodes.SAME_ACCOUNT_TRANSFER
      );
    }

    const tx = this.db.transaction(() => {
      // 1. Check for duplicate transfer reference_id
      const dupCheckStmt = this.db.prepare(
        'SELECT id FROM transfers WHERE reference_id = ?'
      );
      const existingTransfer = dupCheckStmt.get(dto.reference_id);
      if (existingTransfer) {
        throw new DuplicateTransactionError(
          dto.source_account_id,
          dto.reference_id
        );
      }

      // 2. Fetch source account
      const sourceStmt = this.db.prepare(
        'SELECT id, balance FROM accounts WHERE id = ?'
      );
      const sourceAccount = sourceStmt.get(dto.source_account_id) as
        | { id: string; balance: number }
        | undefined;
      if (!sourceAccount) {
        throw new AccountNotFoundError(dto.source_account_id);
      }

      // 3. Fetch destination account
      const destStmt = this.db.prepare(
        'SELECT id, balance FROM accounts WHERE id = ?'
      );
      const destAccount = destStmt.get(dto.destination_account_id) as
        | { id: string; balance: number }
        | undefined;
      if (!destAccount) {
        throw new AccountNotFoundError(dto.destination_account_id);
      }

      // 4. Check sufficient balance on source account
      if (sourceAccount.balance < dto.amount) {
        throw new InsufficientBalanceError(sourceAccount.balance, dto.amount);
      }

      // 5. Calculate new balances
      const newSourceBalance =
        Math.round((sourceAccount.balance - dto.amount) * 100) / 100;
      const newDestBalance =
        Math.round((destAccount.balance + dto.amount) * 100) / 100;

      // 6. Update both accounts
      const updateStmt = this.db.prepare(
        'UPDATE accounts SET balance = ? WHERE id = ?'
      );
      updateStmt.run(newSourceBalance, dto.source_account_id);
      updateStmt.run(newDestBalance, dto.destination_account_id);

      const timestamp = new Date().toISOString();

      // 7. Insert debit transaction for source account
      const sourceTxId = uuidv4();
      const insertTxStmt = this.db.prepare(`
        INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertTxStmt.run(
        sourceTxId,
        dto.source_account_id,
        'debit',
        dto.amount,
        dto.description
          ? `Transfer to ${dto.destination_account_id}: ${dto.description}`
          : `Transfer to ${dto.destination_account_id}`,
        `trf_${dto.reference_id}_out`,
        timestamp
      );

      // 8. Insert credit transaction for destination account
      const destTxId = uuidv4();
      insertTxStmt.run(
        destTxId,
        dto.destination_account_id,
        'credit',
        dto.amount,
        dto.description
          ? `Transfer from ${dto.source_account_id}: ${dto.description}`
          : `Transfer from ${dto.source_account_id}`,
        `trf_${dto.reference_id}_in`,
        timestamp
      );

      // 9. Record transfer
      const transferId = uuidv4();
      const insertTransferStmt = this.db.prepare(`
        INSERT INTO transfers (
          id, source_account_id, destination_account_id, amount,
          reference_id, description, source_transaction_id, destination_transaction_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertTransferStmt.run(
        transferId,
        dto.source_account_id,
        dto.destination_account_id,
        dto.amount,
        dto.reference_id,
        dto.description || null,
        sourceTxId,
        destTxId,
        timestamp
      );

      return {
        id: transferId,
        source_account_id: dto.source_account_id,
        destination_account_id: dto.destination_account_id,
        amount: dto.amount,
        reference_id: dto.reference_id,
        description: dto.description || null,
        source_balance_after: newSourceBalance,
        destination_balance_after: newDestBalance,
        source_transaction_id: sourceTxId,
        destination_transaction_id: destTxId,
        created_at: timestamp,
      };
    });

    return tx();
  }
}

export const transferRepository = new TransferRepository();
