import 'reflect-metadata';
import { AppDataSource } from './config/database';
import app from './app';

const PORT = process.env.PORT || 3000;

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log(' Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error(' Database connection failed:', error);
    process.exit(1);
  });