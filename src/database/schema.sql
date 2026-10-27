-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= 0),
    created_at TEXT NOT NULL
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT,
    reference_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    UNIQUE(account_id, reference_id)
);

-- Transfers Table (Bonus Feature: Multi-account atomic transfers)
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    source_account_id TEXT NOT NULL,
    destination_account_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    reference_id TEXT NOT NULL UNIQUE,
    description TEXT,
    source_transaction_id TEXT NOT NULL,
    destination_transaction_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_type ON transactions(account_id, type);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON transfers(source_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON transfers(destination_account_id);
