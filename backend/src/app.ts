import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { config } from './config/index.js';

export const app = express();

app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Centralized error handler
app.use(errorHandler);
