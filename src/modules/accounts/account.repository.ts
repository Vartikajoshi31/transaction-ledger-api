import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection.js';
import { Account } from './account.types.js';

export class AccountRepository {
  private get db(): Database {
    return getDatabase();
  }

  create(account: Account): Account {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, name, balance, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(account.id, account.name, account.balance, account.created_at);
    return account;
  }

  findById(id: string): Account | null {
    const stmt = this.db.prepare(`
      SELECT id, name, balance, created_at
      FROM accounts
      WHERE id = ?
    `);
    const row = stmt.get(id) as Account | undefined;
    return row || null;
  }

  findAll(): Account[] {
    const stmt = this.db.prepare(`
      SELECT id, name, balance, created_at
      FROM accounts
      ORDER BY created_at DESC
    `);
    return stmt.all() as Account[];
  }

  updateBalance(id: string, newBalance: number): void {
    const stmt = this.db.prepare(`
      UPDATE accounts
      SET balance = ?
      WHERE id = ?
    `);
    stmt.run(newBalance, id);
  }
}

export const accountRepository = new AccountRepository();
