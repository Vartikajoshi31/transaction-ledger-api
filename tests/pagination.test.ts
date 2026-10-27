import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Transaction History, Filtering & Pagination', () => {
  let app: Express;
  let accountId: string;

  beforeEach(async () => {
    app = setupTestApp();
    const res = await request(app).post('/accounts').send({ name: 'History Test' });
    accountId = res.body.id;

    // Create 5 transactions: 3 credits and 2 debits
    // 1. Credit 100
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 100,
      reference_id: 'ref-1',
      description: 'First deposit',
    });

    // 2. Credit 50
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 50,
      reference_id: 'ref-2',
      description: 'Second deposit',
    });

    // 3. Debit 20
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'debit',
      amount: 20,
      reference_id: 'ref-3',
      description: 'Coffee',
    });

    // 4. Credit 30
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'credit',
      amount: 30,
      reference_id: 'ref-4',
      description: 'Bonus',
    });

    // 5. Debit 40
    await request(app).post('/transactions').send({
      account_id: accountId,
      type: 'debit',
      amount: 40,
      reference_id: 'ref-5',
      description: 'Dinner',
    });
  });

  afterEach(() => {
    teardownTestApp();
  });

  describe('Sorting (Latest-first order)', () => {
    it('should return transactions in latest-first order based on created_at', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions`);

      expect(res.status).toBe(200);
      expect(res.body.transactions).toHaveLength(5);
      // Latest transaction was ref-5
      expect(res.body.transactions[0].reference_id).toBe('ref-5');
      // Earliest was ref-1
      expect(res.body.transactions[4].reference_id).toBe('ref-1');
    });
  });

  describe('Filtering by Type', () => {
    it('should filter only credit transactions when type=credit', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions?type=credit`);

      expect(res.status).toBe(200);
      expect(res.body.total_records).toBe(3);
      expect(res.body.transactions).toHaveLength(3);
      res.body.transactions.forEach((tx: any) => {
        expect(tx.type).toBe('credit');
      });
    });

    it('should filter only debit transactions when type=debit', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions?type=debit`);

      expect(res.status).toBe(200);
      expect(res.body.total_records).toBe(2);
      expect(res.body.transactions).toHaveLength(2);
      res.body.transactions.forEach((tx: any) => {
        expect(tx.type).toBe('debit');
      });
    });

    it('should return both credit and debit when no type filter is supplied', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions`);

      expect(res.status).toBe(200);
      expect(res.body.total_records).toBe(5);
      expect(res.body.transactions).toHaveLength(5);
    });

    it('should reject invalid filter type', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions?type=transfer`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Pagination', () => {
    it('should correctly paginate transactions with page and limit parameters', async () => {
      // Page 1, limit 2
      const page1Res = await request(app).get(`/accounts/${accountId}/transactions?page=1&limit=2`);
      expect(page1Res.status).toBe(200);
      expect(page1Res.body.page).toBe(1);
      expect(page1Res.body.limit).toBe(2);
      expect(page1Res.body.total_records).toBe(5);
      expect(page1Res.body.total_pages).toBe(3);
      expect(page1Res.body.transactions).toHaveLength(2);
      expect(page1Res.body.transactions[0].reference_id).toBe('ref-5');

      // Page 2, limit 2
      const page2Res = await request(app).get(`/accounts/${accountId}/transactions?page=2&limit=2`);
      expect(page2Res.status).toBe(200);
      expect(page2Res.body.page).toBe(2);
      expect(page2Res.body.transactions).toHaveLength(2);
      expect(page2Res.body.transactions[0].reference_id).toBe('ref-3');

      // Page 3, limit 2 (last remaining record)
      const page3Res = await request(app).get(`/accounts/${accountId}/transactions?page=3&limit=2`);
      expect(page3Res.status).toBe(200);
      expect(page3Res.body.page).toBe(3);
      expect(page3Res.body.transactions).toHaveLength(1);
      expect(page3Res.body.transactions[0].reference_id).toBe('ref-1');
    });

    it('should return 400 for negative or non-integer page', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions?page=0`);
      expect(res.status).toBe(400);
    });

    it('should return 400 for limit exceeding 100', async () => {
      const res = await request(app).get(`/accounts/${accountId}/transactions?limit=150`);
      expect(res.status).toBe(400);
    });

    it('should return 404 for transaction history of nonexistent account', async () => {
      const res = await request(app).get('/accounts/non-existent-uuid/transactions');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });
});
