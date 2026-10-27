import { z } from 'zod';

export const createAccountSchema = z
  .object({
    name: z
      .string({ message: 'Account name is required' })
      .trim()
      .min(1, 'Account name cannot be empty')
      .max(255, 'Account name cannot exceed 255 characters'),
  })
  .strict();

export const accountIdParamSchema = z.object({
  id: z
    .string({ message: 'Account ID is required' })
    .trim()
    .min(1, 'Account ID cannot be empty'),
});
