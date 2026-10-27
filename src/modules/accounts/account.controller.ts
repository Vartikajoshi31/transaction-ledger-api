import { Request, Response, NextFunction } from 'express';
import { accountService, AccountService } from './account.service.js';

export class AccountController {
  constructor(private service: AccountService = accountService) {}

  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = this.service.createAccount(req.body);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  };

  getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const balanceInfo = this.service.getBalance(id);
      res.status(200).json(balanceInfo);
    } catch (error) {
      next(error);
    }
  };

  getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const account = this.service.getAccountById(id);
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  };

  getAllAccounts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = this.service.getAllAccounts();
      res.status(200).json({
        total: accounts.length,
        accounts,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const accountController = new AccountController();
