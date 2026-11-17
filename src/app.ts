import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { chatRouter } from './routes/chat.routes';
import { messageRouter } from './routes/message.routes';
import { errorHandler } from './middleware/error-handler';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map(value => value.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'Chat API is healthy' }));
app.use(chatRouter);
app.use(messageRouter);
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);
