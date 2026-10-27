import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Data Integrity, Atomicity & Balance Consistency', () => {
  let app: Express;
  let accountId: string;

  beforeEach(async () => {
    app = setupTestApp();
    const res = await request(app).post('/accounts').send({ name: 'Integrity Test Account' });
    accountId = res.body.id;
  });

  afterEach(() => {
    teardownTestApp();
  });

  it('should maintain perfect balance consistency over multiple transactions (Prompt Example)', async () => {
    // Initial balance: 0
    let balRes = await request(app).get(`/accounts/${accountId}/balance`);
    expect(balRes.body.balance).toBe(0);

    // Credit: 100
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 100,
      reference_id: 'step-1',
    });

    // Credit: 50
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 50,
      reference_id: 'step-2',
    });

    // Debit: 30
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'debit',
      amount: 30,
      reference_id: 'step-3',
    });

    // Debit: 20
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'debit',
      amount: 20,
      reference_id: 'step-4',
    });

    // Final balance must be 100
    balRes = await request(app).get(`/accounts/${accountId}/balance`);
    expect(balRes.body.balance).toBe(100);

    // Verify all 4 transactions are recorded
    const historyRes = await request(app).get(`/accounts/${accountId}/transactions`);
    expect(historyRes.body.total_records).toBe(4);
  });

  it('should not alter account balance or record transaction when debit is rejected', async () => {
    // Initial balance: 50
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 50,
      reference_id: 'seed-50',
    });

    // Debit 100 (fails due to insufficient funds)
    const failedRes = await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'debit',
      amount: 100,
      reference_id: 'fail-overdraft',
    });
    expect(failedRes.status).toBe(422);

    // Balance must remain 50
    const balRes = await request(app).get(`/accounts/${accountId}/balance`);
    expect(balRes.body.balance).toBe(50);

    // Only 1 transaction must exist in history
    const historyRes = await request(app).get(`/accounts/${accountId}/transactions`);
    expect(historyRes.body.total_records).toBe(1);
    expect(historyRes.body.transactions[0].reference_id).toBe('seed-50');
  });

  it('should guarantee transaction immutability (no edit or delete APIs exposed)', async () => {
    const tx = await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 100,
      reference_id: 'immutable-1',
    });

    const txId = tx.body.id;

    // Attempt PUT
    const putRes = await request(app).put(`/transactions/${txId}`).send({ amount: 200 });
    expect(putRes.status).toBe(404);

    // Attempt PATCH
    const patchRes = await request(app).patch(`/transactions/${txId}`).send({ amount: 200 });
    expect(patchRes.status).toBe(404);

    // Attempt DELETE
    const deleteRes = await request(app).delete(`/transactions/${txId}`);
    expect(deleteRes.status).toBe(404);
  });
});
