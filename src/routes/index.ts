import { Router } from 'express';
import { accountController } from '../modules/accounts/account.controller.js';
import { transactionController } from '../modules/transactions/transaction.controller.js';
import { transferController } from '../modules/transfers/transfer.controller.js';
import { validate } from '../middleware/validate.js';
import {
  createAccountSchema,
  accountIdParamSchema,
} from '../modules/accounts/account.validation.js';
import {
  createTransactionSchema,
  getTransactionsQuerySchema,
} from '../modules/transactions/transaction.validation.js';
import { createTransferSchema } from '../modules/transfers/transfer.validation.js';

export function createApiRouter(): Router {
  const router = Router();

  // Healthcheck endpoint
  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Account endpoints
  router.post(
    '/accounts',
    validate({ body: createAccountSchema }),
    accountController.createAccount
  );

  router.get('/accounts', accountController.getAllAccounts);

  router.get(
    '/accounts/:id',
    validate({ params: accountIdParamSchema }),
    accountController.getAccountById
  );

  router.get(
    '/accounts/:id/balance',
    validate({ params: accountIdParamSchema }),
    accountController.getBalance
  );

  // Transaction endpoints
  router.post(
    '/transactions',
    validate({ body: createTransactionSchema }),
    transactionController.createTransaction
  );

  // Support RESTful nested transaction creation: POST /accounts/:accountId/transactions
  router.post(
    '/accounts/:accountId/transactions',
    (req, _res, next) => {
      if (!req.body.account_id && req.params.accountId) {
        req.body.account_id = req.params.accountId;
      }
      next();
    },
    validate({ body: createTransactionSchema }),
    transactionController.createTransaction
  );

  // Get Transaction History: GET /accounts/:id/transactions
  router.get(
    '/accounts/:id/transactions',
    validate({
      params: accountIdParamSchema,
      query: getTransactionsQuerySchema,
    }),
    transactionController.getTransactions
  );

  // Bonus: Money Transfer endpoint
  router.post(
    '/transfers',
    validate({ body: createTransferSchema }),
    transferController.transfer
  );

  return router;
}
