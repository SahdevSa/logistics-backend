import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Product } from '../entities/Product.entity';
import { Order } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'logistics_db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [Product, Order, OrderItem],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
  charset: 'utf8mb4',
});