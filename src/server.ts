import { createApp } from './app.js';
import { initializeDatabase } from './database/connection.js';
import { config } from './config/index.js';

function bootstrap(): void {
  // Initialize Database
  initializeDatabase();
  console.log(`[Database] Connected to SQLite at: ${config.dbPath}`);

  // Create Express application
  const app = createApp();

  // Start HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`=================================================`);
    console.log(`🚀 Transaction Ledger API is live!`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`📚 Interactive Swagger API Docs: http://localhost:${config.port}/docs`);
    console.log(`❤️  Health Check: http://localhost:${config.port}/health`);
    console.log(`=================================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('Gracefully shutting down...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
