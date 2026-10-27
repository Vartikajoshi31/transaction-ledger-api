import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';
import { config } from './config/index.js';

export function createApp(): Express {
  const app = express();

  // Security and standard middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());

  // Logging (suppressed in test environment)
  if (config.env !== 'test') {
    app.use(morgan('dev'));
  }

  // Swagger UI Documentation setup
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let swaggerFilePath = path.resolve(__dirname, 'docs', 'swagger.yaml');
  if (!fs.existsSync(swaggerFilePath)) {
    swaggerFilePath = path.resolve(process.cwd(), 'src', 'docs', 'swagger.yaml');
  }

  if (fs.existsSync(swaggerFilePath)) {
    const swaggerDoc = YAML.parse(fs.readFileSync(swaggerFilePath, 'utf-8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    app.get('/docs.json', (_req: Request, res: Response) => {
      res.json(swaggerDoc);
    });
  }

  // Mount API router under /api/v1 and root / for convenience
  const apiRouter = createApiRouter();
  app.use('/api/v1', apiRouter);
  app.use('/', apiRouter);

  // Catch-all for unmatched routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
