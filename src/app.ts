import express, { Application } from 'express';
import 'reflect-metadata';
import dotenv from 'dotenv';
import orderRoutes from './routes/order.routes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check: Just for Testing Purpose, nothing to do with the project requirements
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes: handle order-related endpoints
app.use('/orders', orderRoutes);

// Error handling (must be last) as best practices
app.use(errorHandler);

export default app;