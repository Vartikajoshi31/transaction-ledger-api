import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Concurrency & Race Condition Safety', () => {
  let app: Express;
  let accountId: string;

  beforeEach(async () => {
    app = setupTestApp();
    const res = await request(app).post('/accounts').send({ name: 'Concurrent Test Account' });
    accountId = res.body.id;
  });

  afterEach(() => {
    teardownTestApp();
  });

  it('should handle concurrent debit transactions safely without negative balance or race conditions', async () => {
    // 1. Credit 100 to start
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 100,
      reference_id: 'seed-concurrency-100',
    });

    // 2. Fire 10 concurrent debit requests of 15 each (Total attempted: 150, but only 100 available)
    const debitPromises = Array.from({ length: 10 }).map((_, index) =>
      request(app).post('/transactions').send({
        account_id: accountId,
        type: 'debit',
        amount: 15,
        reference_id: `concurrent-debit-${index}`,
      })
    );

    const responses = await Promise.all(debitPromises);

    const successfulDebits = responses.filter((r) => r.status === 201);
    const rejectedDebits = responses.filter((r) => r.status === 422);

    // Exactly 6 requests (6 * 15 = 90) should succeed, and 4 should fail (since 90 + 15 = 105 > 100)
    expect(successfulDebits.length).toBe(6);
    expect(rejectedDebits.length).toBe(4);

    // Final balance must be exactly 100 - 90 = 10
    const finalBalance = await request(app).get(`/accounts/${accountId}/balance`);
    expect(finalBalance.body.balance).toBe(10);
  });

  it('should handle concurrent credit transactions without dropped updates', async () => {
    // Fire 20 concurrent credit requests of 10 each
    const creditPromises = Array.from({ length: 20 }).map((_, index) =>
      request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 10,
        reference_id: `concurrent-credit-${index}`,
      })
    );

    const responses = await Promise.all(creditPromises);

    responses.forEach((res) => {
      expect(res.status).toBe(201);
    });

    // Final balance must be 20 * 10 = 200
    const finalBalance = await request(app).get(`/accounts/${accountId}/balance`);
    expect(finalBalance.body.balance).toBe(200);

    // Total records must be 20
    const history = await request(app).get(`/accounts/${accountId}/transactions?limit=100`);
    expect(history.body.total_records).toBe(20);
  });
});
