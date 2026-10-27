# 📖 Transaction Ledger API — Documentation

The **Transaction Ledger API** is a high-performance, strictly consistent financial ledger system designed to maintain immutable audit trails, atomic balance updates, and account transfers.

- **Base URL:** `http://localhost:3000` (or `http://localhost:3000/api/v1`)
- **Interactive Swagger UI:** `http://localhost:3000/docs`
- **OpenAPI 3.0 Specification:** `http://localhost:3000/docs.json`

---

## 📌 Standard Error Format

All error responses across all endpoints follow a uniform JSON structure:

```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance: current balance is 100.00, cannot debit 150.00",
  "details": []
}
```

### Standard Error Codes

| Status Code | Error Code | Description |
|:---|:---|:---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload, query param, or URL param failed schema validation |
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON or invalid request syntax |
| `400 Bad Request` | `SAME_ACCOUNT_TRANSFER` | Source and destination accounts cannot be identical |
| `404 Not Found` | `ACCOUNT_NOT_FOUND` | Account with the specified ID was not found |
| `404 Not Found` | `NOT_FOUND` | Requested route does not exist |
| `409 Conflict` | `DUPLICATE_TRANSACTION` | `reference_id` has already been recorded for this account or transfer |
| `422 Unprocessable` | `INSUFFICIENT_BALANCE` | Account does not possess sufficient funds to complete debit / transfer |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unexpected server failure |

---

## 🚀 Endpoints

### 1. Create Account

Creates a new ledger account.
- **Initial balance is always set to `0.00`** by the system.
- The client cannot set or override the initial balance.
- `id` (UUID v4) and `created_at` (ISO 8601 timestamp) are automatically generated.

- **Method:** `POST`
- **Path:** `/accounts` (or `/api/v1/accounts`)

#### Request Body
```json
{
  "name": "Alice Smith"
}
```

#### Field Specifications
| Field | Type | Required | Constraints |
|:---|:---|:---:|:---|
| `name` | string | **Yes** | Trimmed, non-empty, max 255 chars |

#### Response (`201 Created`)
```json
{
  "id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "name": "Alice Smith",
  "balance": 0,
  "created_at": "2026-10-27T14:30:00.000Z"
}
```

#### Example cURL
```bash
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'
```

---

### 2. Get Account Balance

Fetches the current real-time balance of an account.

- **Method:** `GET`
- **Path:** `/accounts/:id/balance` (or `/api/v1/accounts/:id/balance`)

#### Parameters
| Parameter | In | Type | Required | Description |
|:---|:---|:---|:---:|:---|
| `id` | Path | string | **Yes** | Account ID |

#### Response (`200 OK`)
```json
{
  "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "balance": 150.00,
  "name": "Alice Smith",
  "created_at": "2026-10-27T14:30:00.000Z"
}
```

#### Error Response (`404 Not Found`)
```json
{
  "success": false,
  "error": "ACCOUNT_NOT_FOUND",
  "code": "ACCOUNT_NOT_FOUND",
  "message": "Account with ID 'invalid-id' does not exist"
}
```

#### Example cURL
```bash
curl -X GET http://localhost:3000/accounts/7f09f074-b52f-4fcb-83c9-9ebc82ff2fba/balance
```

---

### 3. Add Transaction (Credit or Debit)

Applies a debit or credit transaction to an account atomically.

- **Credit:** Increases the account balance by `amount`.
- **Debit:** Decreases the account balance by `amount`. Rejects with `422 INSUFFICIENT_BALANCE` if `balance < amount`.
- **Duplicate Prevention:** Rejects with `409 DUPLICATE_TRANSACTION` if `reference_id` is re-submitted for the same account. The same `reference_id` may be used for other accounts.
- **Immutability:** Once written, transactions cannot be altered or deleted.

- **Method:** `POST`
- **Path:** `/transactions` (or `/accounts/:accountId/transactions`)

#### Request Body
```json
{
  "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "type": "credit",
  "amount": 100.50,
  "reference_id": "INV-2026-001",
  "description": "Consulting invoice payment"
}
```

#### Field Specifications
| Field | Type | Required | Constraints |
|:---|:---|:---:|:---|
| `account_id` | string | **Yes** | Must match existing account |
| `type` | string | **Yes** | Must be either `"credit"` or `"debit"` |
| `amount` | number | **Yes** | Must be `> 0`, max 2 decimal places |
| `reference_id` | string | **Yes** | Unique per account, max 255 chars |
| `description` | string | No | Optional note, max 500 chars |

#### Response (`201 Created`)
```json
{
  "id": "e43b171f-0be0-449d-b4b3-0570b6d274ff",
  "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "type": "credit",
  "amount": 100.5,
  "description": "Consulting invoice payment",
  "reference_id": "INV-2026-001",
  "created_at": "2026-10-27T14:35:10.120Z"
}
```

#### Example cURL
```bash
# Credit
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
    "type": "credit",
    "amount": 100.50,
    "reference_id": "INV-2026-001",
    "description": "Salary deposit"
  }'

# Debit
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
    "type": "debit",
    "amount": 30.00,
    "reference_id": "ATM-WITHDRAW-01",
    "description": "Cash withdrawal"
  }'
```

---

### 4. Get Transaction History

Retrieves all transactions for an account with sorting, pagination, and type filtering.
- **Sorting:** Strictly in **latest-first order** based on `created_at DESC`.
- **Filtering:** Filter by `type=credit` or `type=debit`. If omitted, both types are returned.
- **Pagination:** Parameters `page` (default 1) and `limit` (default 10).

- **Method:** `GET`
- **Path:** `/accounts/:id/transactions`

#### Query Parameters
| Parameter | Type | Default | Description |
|:---|:---|:---:|:---|
| `type` | string | `undefined` | `"credit"` or `"debit"` |
| `page` | integer | `1` | Page number (`>= 1`) |
| `limit` | integer | `10` | Page size (`1` to `100`) |

#### Response (`200 OK`)
```json
{
  "page": 1,
  "limit": 10,
  "total_records": 2,
  "total_pages": 1,
  "transactions": [
    {
      "id": "673f8409-cfbd-45a8-b98a-aef23be05b76",
      "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
      "type": "debit",
      "amount": 30,
      "description": "Cash withdrawal",
      "reference_id": "ATM-WITHDRAW-01",
      "created_at": "2026-10-27T14:40:00.000Z"
    },
    {
      "id": "e43b171f-0be0-449d-b4b3-0570b6d274ff",
      "account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
      "type": "credit",
      "amount": 100.5,
      "description": "Salary deposit",
      "reference_id": "INV-2026-001",
      "created_at": "2026-10-27T14:35:10.120Z"
    }
  ],
  "data": [ ... ]
}
```

#### Example cURL
```bash
curl -X GET "http://localhost:3000/accounts/7f09f074-b52f-4fcb-83c9-9ebc82ff2fba/transactions?type=credit&page=1&limit=5"
```

---

### 5. Money Transfer (Bonus Feature)

Transfers funds atomically between two accounts.
- Source account balance is debited by `amount`.
- Destination account balance is credited by `amount`.
- Operates inside an **ACID transaction**: if either operation fails (e.g. insufficient balance, non-existent destination), the entire transfer is rolled back. Partial transfers are impossible.
- Records corresponding ledger entries for both accounts with transfer references.
- Same-account transfer is rejected.

- **Method:** `POST`
- **Path:** `/transfers` (or `/api/v1/transfers`)

#### Request Body
```json
{
  "source_account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "destination_account_id": "bb0ea9d8-9df2-4ce0-8d59-328659d9f58c",
  "amount": 30.00,
  "reference_id": "TRF-2026-9901",
  "description": "Lunch reimbursement"
}
```

#### Response (`200 OK`)
```json
{
  "id": "4b5d63f2-1a42-4fec-a39c-e350aa140fa9",
  "source_account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
  "destination_account_id": "bb0ea9d8-9df2-4ce0-8d59-328659d9f58c",
  "amount": 30,
  "reference_id": "TRF-2026-9901",
  "description": "Lunch reimbursement",
  "source_balance_after": 70,
  "destination_balance_after": 80,
  "source_transaction_id": "31b26fc4-e22e-4009-8d76-1279a0cf8b6e",
  "destination_transaction_id": "403dbce4-9271-4770-ae0e-79db04b99831",
  "created_at": "2026-10-27T14:45:00.000Z"
}
```

#### Example cURL
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
    "destination_account_id": "bb0ea9d8-9df2-4ce0-8d59-328659d9f58c",
    "amount": 30.00,
    "reference_id": "TRF-2026-9901",
    "description": "Project split"
  }'
```

---

### 6. List All Accounts

Lists all accounts in system, sorted newest first.

- **Method:** `GET`
- **Path:** `/accounts` (or `/api/v1/accounts`)

#### Response (`200 OK`)
```json
{
  "total": 2,
  "accounts": [
    {
      "id": "bb0ea9d8-9df2-4ce0-8d59-328659d9f58c",
      "name": "Bob Jones",
      "balance": 80,
      "created_at": "2026-10-27T14:32:00.000Z"
    },
    {
      "id": "7f09f074-b52f-4fcb-83c9-9ebc82ff2fba",
      "name": "Alice Smith",
      "balance": 70,
      "created_at": "2026-10-27T14:30:00.000Z"
    }
  ]
}
```

---

### 7. Health Check

Verifies server health and database connectivity.

- **Method:** `GET`
- **Path:** `/health`

#### Response (`200 OK`)
```json
{
  "status": "healthy",
  "timestamp": "2026-10-27T14:50:00.000Z"
}
```
