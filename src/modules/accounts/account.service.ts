import { v4 as uuidv4 } from 'uuid';
import { Account, AccountBalanceResponse, CreateAccountDTO } from './account.types.js';
import { accountRepository, AccountRepository } from './account.repository.js';
import { AccountNotFoundError } from '../../errors/AppError.js';

export class AccountService {
  constructor(private repo: AccountRepository = accountRepository) {}

  createAccount(data: CreateAccountDTO): Account {
    const newAccount: Account = {
      id: uuidv4(),
      name: data.name.trim(),
      balance: 0.0,
      created_at: new Date().toISOString(),
    };

    return this.repo.create(newAccount);
  }

  getAccountById(id: string): Account {
    const account = this.repo.findById(id);
    if (!account) {
      throw new AccountNotFoundError(id);
    }
    return account;
  }

  getBalance(id: string): AccountBalanceResponse {
    const account = this.getAccountById(id);
    return {
      account_id: account.id,
      balance: account.balance,
      name: account.name,
      created_at: account.created_at,
    };
  }

  getAllAccounts(): Account[] {
    return this.repo.findAll();
  }
}

export const accountService = new AccountService();
