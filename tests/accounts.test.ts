import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, teardownTestApp } from './testHelper.js';

describe('Accounts API', () => {
  let app: Express;

  beforeEach(() => {
    app = setupTestApp();
  });

  afterEach(() => {
    teardownTestApp();
  });

  describe('POST /accounts (Create Account)', () => {
    it('should create an account with balance 0 and auto-generated UUID and created_at', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ name: 'Alice Smith' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('string');
      expect(res.body.name).toBe('Alice Smith');
      expect(res.body.balance).toBe(0);
      expect(res.body).toHaveProperty('created_at');
      expect(new Date(res.body.created_at).getTime()).not.toBeNaN();
    });

    it('should reject request when account name is missing', async () => {
      const res = await request(app).post('/accounts').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request when account name is empty or only whitespace', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should not allow client to set initial balance', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ name: 'Bob Hacker', balance: 1000 });

      // Due to strict schema, client cannot supply balance
      expect(res.status).toBe(400);
    });
  });

  describe('GET /accounts/:id/balance (Get Account Balance)', () => {
    it('should return account_id and current balance for existing account', async () => {
      const createRes = await request(app)
        .post('/accounts')
        .send({ name: 'Charlie' });
      const accountId = createRes.body.id;

      const res = await request(app).get(`/accounts/${accountId}/balance`);

      expect(res.status).toBe(200);
      expect(res.body.account_id).toBe(accountId);
      expect(res.body.balance).toBe(0);
      expect(res.body.name).toBe('Charlie');
    });

    it('should return 404 ACCOUNT_NOT_FOUND when account does not exist', async () => {
      const res = await request(app).get('/accounts/non-existent-uuid/balance');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });

  describe('GET /accounts/:id and GET /accounts', () => {
    it('should retrieve account details by ID', async () => {
      const createRes = await request(app)
        .post('/accounts')
        .send({ name: 'Diana' });
      const accountId = createRes.body.id;

      const res = await request(app).get(`/accounts/${accountId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(accountId);
      expect(res.body.name).toBe('Diana');
      expect(res.body.balance).toBe(0);
    });

    it('should list all accounts', async () => {
      await request(app).post('/accounts').send({ name: 'User 1' });
      await request(app).post('/accounts').send({ name: 'User 2' });

      const res = await request(app).get('/accounts');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.accounts).toHaveLength(2);
    });
  });
});
