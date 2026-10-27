import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/errorCodes.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({
      success: false,
      error: ErrorCodes.VALIDATION_ERROR,
      code: ErrorCodes.VALIDATION_ERROR,
      message: details[0]?.message || 'Validation failed',
      details,
    });
    return;
  }

  // Handle SQLite constraint violations that might bubble up
  const sqliteError = err as { code?: string; message: string };
  if (sqliteError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({
      success: false,
      error: ErrorCodes.DUPLICATE_TRANSACTION,
      code: ErrorCodes.DUPLICATE_TRANSACTION,
      message: 'Transaction with this reference_id already exists for this account',
    });
    return;
  }

  if (sqliteError.code === 'SQLITE_CONSTRAINT_CHECK') {
    res.status(422).json({
      success: false,
      error: ErrorCodes.INSUFFICIENT_BALANCE,
      code: ErrorCodes.INSUFFICIENT_BALANCE,
      message: 'Database check constraint failed: balance cannot be negative',
    });
    return;
  }

  // Handle malformed JSON body
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: ErrorCodes.BAD_REQUEST,
      code: ErrorCodes.BAD_REQUEST,
      message: 'Invalid JSON request body',
    });
    return;
  }

  // Fallback for unexpected internal errors
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: ErrorCodes.INTERNAL_SERVER_ERROR,
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected internal server error occurred',
  });
}
