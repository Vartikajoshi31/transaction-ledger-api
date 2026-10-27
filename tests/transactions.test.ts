import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Transactions API', () => {
  let app: Express;
  let accountId: string;

  beforeEach(async () => {
    app = setupTestApp();
    const res = await request(app).post('/accounts').send({ name: 'Test Account' });
    accountId = res.body.id;
  });

  afterEach(() => {
    teardownTestApp();
  });

  describe('Credit Transactions', () => {
    it('should credit an account and increase the balance', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 100.5,
        reference_id: 'ref-tx-001',
        description: 'Salary',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.account_id).toBe(accountId);
      expect(res.body.type).toBe('credit');
      expect(res.body.amount).toBe(100.5);
      expect(res.body.reference_id).toBe('ref-tx-001');

      // Verify balance increased
      const balanceRes = await request(app).get(`/accounts/${accountId}/balance`);
      expect(balanceRes.body.balance).toBe(100.5);
    });

    it('should allow nested route /accounts/:accountId/transactions', async () => {
      const res = await request(app)
        .post(`/accounts/${accountId}/transactions`)
        .send({
          account_id: accountId,
          type: 'credit',
          amount: 50,
          reference_id: 'ref-nested-1',
        });

      expect(res.status).toBe(201);
      const balanceRes = await request(app).get(`/accounts/${accountId}/balance`);
      expect(balanceRes.body.balance).toBe(50);
    });
  });

  describe('Debit Transactions', () => {
    beforeEach(async () => {
      // Seed with initial credit of 100
      await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 100,
        reference_id: 'seed-credit-100',
      });
    });

    it('should debit account and decrease balance when sufficient balance exists', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'debit',
        amount: 30,
        reference_id: 'ref-debit-30',
        description: 'Groceries',
      });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('debit');
      expect(res.body.amount).toBe(30);

      const balanceRes = await request(app).get(`/accounts/${accountId}/balance`);
      expect(balanceRes.body.balance).toBe(70);
    });

    it('should reject debit transaction if account does not have sufficient balance', async () => {
      // Balance is 100, debit 150
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'debit',
        amount: 150,
        reference_id: 'ref-debit-150',
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INSUFFICIENT_BALANCE');

      // Balance must remain unchanged at 100
      const balanceRes = await request(app).get(`/accounts/${accountId}/balance`);
      expect(balanceRes.body.balance).toBe(100);
    });
  });

  describe('Duplicate Transactions Handling', () => {
    it('should reject duplicate reference_id for the same account', async () => {
      // First transaction
      const first = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 100,
        reference_id: 'unique-ref-xyz',
      });
      expect(first.status).toBe(201);

      // Attempt duplicate transaction with same reference_id
      const duplicate = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 100,
        reference_id: 'unique-ref-xyz',
      });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.success).toBe(false);
      expect(duplicate.body.code).toBe('DUPLICATE_TRANSACTION');

      // Verify balance was NOT updated again
      const balanceRes = await request(app).get(`/accounts/${accountId}/balance`);
      expect(balanceRes.body.balance).toBe(100);
    });

    it('should allow the same reference_id for different accounts', async () => {
      const secondAcc = await request(app).post('/accounts').send({ name: 'Second Account' });
      const secondId = secondAcc.body.id;

      // Account 1 transaction
      const tx1 = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 50,
        reference_id: 'shared-ref-123',
      });
      expect(tx1.status).toBe(201);

      // Account 2 using same reference_id
      const tx2 = await request(app).post('/transactions').send({
        account_id: secondId,
        type: 'credit',
        amount: 80,
        reference_id: 'shared-ref-123',
      });
      expect(tx2.status).toBe(201);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('should return 404 when adding transaction to nonexistent account', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: 'non-existent-account-id',
        type: 'credit',
        amount: 50,
        reference_id: 'ref-nonexistent',
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should reject invalid transaction type', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'deposit', // invalid
        amount: 50,
        reference_id: 'ref-inv-type',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject zero or negative amount', async () => {
      const zeroRes = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 0,
        reference_id: 'ref-zero',
      });
      expect(zeroRes.status).toBe(400);

      const negRes = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: -25,
        reference_id: 'ref-neg',
      });
      expect(negRes.status).toBe(400);
    });

    it('should reject amount with more than 2 decimal places', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 10.555,
        reference_id: 'ref-3dec',
      });

      expect(res.status).toBe(400);
    });

    it('should reject empty reference_id', async () => {
      const res = await request(app).post('/transactions').send({
        account_id: accountId,
        type: 'credit',
        amount: 50,
        reference_id: '   ',
      });

      expect(res.status).toBe(400);
    });
  });
});
