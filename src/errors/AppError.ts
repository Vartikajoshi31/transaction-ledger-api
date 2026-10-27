import { ErrorCode, ErrorCodes } from './errorCodes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCodes.NOT_FOUND) {
    super(404, code, message);
  }
}

export class AccountNotFoundError extends NotFoundError {
  constructor(accountId: string) {
    super(`Account with ID '${accountId}' does not exist`, ErrorCodes.ACCOUNT_NOT_FOUND);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(currentBalance: number, requestedAmount: number) {
    super(
      422,
      ErrorCodes.INSUFFICIENT_BALANCE,
      `Insufficient balance: current balance is ${currentBalance.toFixed(2)}, cannot debit ${requestedAmount.toFixed(2)}`
    );
  }
}

export class DuplicateTransactionError extends AppError {
  constructor(accountId: string, referenceId: string) {
    super(
      409,
      ErrorCodes.DUPLICATE_TRANSACTION,
      `Duplicate transaction: reference_id '${referenceId}' already exists for account '${accountId}'`
    );
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCodes.BAD_REQUEST, details?: unknown) {
    super(400, code, message, details);
  }
}
