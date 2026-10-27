import { Request, Response, NextFunction } from 'express';
import { transactionService, TransactionService } from './transaction.service.js';

export class TransactionController {
  constructor(private service: TransactionService = transactionService) {}

  createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Support nested route /accounts/:accountId/transactions as well
      const account_id = (req.body.account_id || req.params.accountId) as string;
      const transaction = this.service.addTransaction({
        ...req.body,
        account_id,
      });
      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = String(req.params.id || req.params.accountId);
      const { type, page, limit } = req.query as any;

      const result = this.service.getTransactions(accountId, {
        type,
        page,
        limit,
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const transactionController = new TransactionController();
