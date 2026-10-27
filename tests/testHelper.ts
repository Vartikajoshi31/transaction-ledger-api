import { createApp } from '../src/app.js';
import { initializeDatabase, closeDatabase } from '../src/database/connection.js';
import { Express } from 'express';

export function setupTestApp(): Express {
  // Use in-memory SQLite for high-speed, isolated testing
  initializeDatabase(':memory:');
  return createApp();
}

export function teardownTestApp(): void {
  closeDatabase();
}
