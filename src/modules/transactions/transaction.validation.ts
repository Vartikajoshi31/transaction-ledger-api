import { z } from 'zod';

export const createTransactionSchema = z
  .object({
    account_id: z
      .string({ message: 'account_id is required' })
      .trim()
      .min(1, 'account_id cannot be empty'),
    type: z.union([z.literal('credit'), z.literal('debit')], {
      message: "Transaction type must be either 'credit' or 'debit'",
    }),
    amount: z
      .number({ message: 'amount must be a valid number' })
      .positive('amount must be greater than 0')
      .refine(
        (val) => Number.isFinite(val) && Number(val.toFixed(2)) === val,
        'amount cannot have more than 2 decimal places'
      ),
    reference_id: z
      .string({ message: 'reference_id is required' })
      .trim()
      .min(1, 'reference_id cannot be empty')
      .max(255, 'reference_id cannot exceed 255 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'description cannot exceed 500 characters')
      .optional(),
  })
  .strict();

export const getTransactionsQuerySchema = z.object({
  type: z
    .union([z.literal('credit'), z.literal('debit')], {
      message: "Filter type must be either 'credit' or 'debit'",
    })
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => Number.isInteger(val) && val >= 1, {
      message: 'page must be a positive integer >= 1',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 100, {
      message: 'limit must be an integer between 1 and 100',
    }),
});
