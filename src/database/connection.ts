import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

let dbInstance: DatabaseType | null = null;

export function initializeDatabase(customPath?: string): DatabaseType {
  const dbLocation = customPath || config.dbPath;

  // Ensure directory exists if writing to file
  if (dbLocation !== ':memory:') {
    const dir = path.dirname(dbLocation);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbLocation);

  // Configure SQLite for high performance and strict ACID data integrity
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (dbLocation !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  // Locate and apply schema SQL
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src', 'database', 'schema.sql');
  }

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);
  } else {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
