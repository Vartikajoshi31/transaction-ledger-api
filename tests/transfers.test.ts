import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Bonus: Money Transfer API (/transfers)', () => {
  let app: Express;
  let accountAId: string;
  let accountBId: string;

  beforeEach(async () => {
    app = setupTestApp();

    // Create Account A and seed with 100
    const accA = await request(app).post('/accounts').send({ name: 'Account A' });
    accountAId = accA.body.id;
    await request(app).post('/transactions').send({
      account_id: accountAId,
      type: 'credit',
      amount: 100,
      reference_id: 'seed-a-100',
    });

    // Create Account B and seed with 50
    const accB = await request(app).post('/accounts').send({ name: 'Account B' });
    accountBId = accB.body.id;
    await request(app).post('/transactions').send({
      account_id: accountBId,
      type: 'credit',
      amount: 50,
      reference_id: 'seed-b-50',
    });
  });

  afterEach(() => {
    teardownTestApp();
  });

  it('should transfer 30 from Account A to Account B atomically (Prompt Example)', async () => {
    const transferRes = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: accountBId,
      amount: 30,
      reference_id: 'transfer-ref-001',
      description: 'Transfer for project expenses',
    });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.source_balance_after).toBe(70);
    expect(transferRes.body.destination_balance_after).toBe(80);

    // Verify Account A balance
    const balA = await request(app).get(`/accounts/${accountAId}/balance`);
    expect(balA.body.balance).toBe(70);

    // Verify Account B balance
    const balB = await request(app).get(`/accounts/${accountBId}/balance`);
    expect(balB.body.balance).toBe(80);

    // Verify ledger transactions were created for both accounts
    const histA = await request(app).get(`/accounts/${accountAId}/transactions`);
    expect(histA.body.transactions[0].type).toBe('debit');
    expect(histA.body.transactions[0].amount).toBe(30);

    const histB = await request(app).get(`/accounts/${accountBId}/transactions`);
    expect(histB.body.transactions[0].type).toBe('credit');
    expect(histB.body.transactions[0].amount).toBe(30);
  });

  it('should reject transfer when source account has insufficient balance', async () => {
    // Account A has 100, try to transfer 150
    const res = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: accountBId,
      amount: 150,
      reference_id: 'transfer-fail-funds',
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');

    // Both balances must remain completely unchanged
    const balA = await request(app).get(`/accounts/${accountAId}/balance`);
    expect(balA.body.balance).toBe(100);

    const balB = await request(app).get(`/accounts/${accountBId}/balance`);
    expect(balB.body.balance).toBe(50);
  });

  it('should reject transfer between identical accounts (same source and destination)', async () => {
    const res = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: accountAId,
      amount: 10,
      reference_id: 'transfer-self',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject transfer if source or destination does not exist', async () => {
    const res = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: 'non-existent-account-id',
      amount: 10,
      reference_id: 'transfer-missing-dest',
    });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('should reject duplicate transfer reference_id', async () => {
    const first = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: accountBId,
      amount: 10,
      reference_id: 'dup-transfer-ref',
    });
    expect(first.status).toBe(200);

    const dup = await request(app).post('/transfers').send({
      source_account_id: accountAId,
      destination_account_id: accountBId,
      amount: 10,
      reference_id: 'dup-transfer-ref',
    });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE_TRANSACTION');
  });
});
