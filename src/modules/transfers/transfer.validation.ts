import { z } from 'zod';

export const createTransferSchema = z
  .object({
    source_account_id: z
      .string({ message: 'source_account_id is required' })
      .trim()
      .min(1, 'source_account_id cannot be empty'),
    destination_account_id: z
      .string({ message: 'destination_account_id is required' })
      .trim()
      .min(1, 'destination_account_id cannot be empty'),
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
  .strict()
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: 'source_account_id and destination_account_id cannot be the same account',
    path: ['destination_account_id'],
  });
