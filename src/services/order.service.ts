import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../entities/Order.entity';
import { OrderItem } from '../entities/OrderItem.entity';
import { Product } from '../entities/Product.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { AppError } from '../middlewares/errorHandler';
import { generateOrderNumber } from '../utils/orderNumberGenerator';
import { Between, FindOptionsWhere } from 'typeorm';

export class OrderService {
  /**
   * Create Order with Transaction and Pessimistic Locking
   * This prevents race conditions when multiple orders are placed simultaneously
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Validate and lock products (PESSIMISTIC_WRITE prevents concurrent updates)
      const orderItemsData: Array<{
        product: Product;
        quantity: number;
      }> = [];

      for (const item of createOrderDto.items) {
        // Lock the product row until transaction completes
        const product = await queryRunner.manager.findOne(Product, {
          where: { sku: item.sku },
          lock: { mode: 'pessimistic_write' }, // Critical for concurrency
        });

        if (!product) {
          throw new AppError(`Product with SKU ${item.sku} not found`, 404);
        }

        // Check stock availability
        if (product.stock_qty < item.qty) {
          throw new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.stock_qty}, Requested: ${item.qty}`,
            400
          );
        }

        orderItemsData.push({
          product,
          quantity: item.qty,
        });
      }

      // Step 2: Deduct stock quantities
      for (const { product, quantity } of orderItemsData) {
        product.stock_qty -= quantity;
        await queryRunner.manager.save(Product, product);
      }

      // Step 3: Calculate total amount
      const totalAmount = orderItemsData.reduce(
        (sum, { product, quantity }) => sum + Number(product.price) * quantity,
        0
      );

      // Step 4: Create order
      const order = queryRunner.manager.create(Order, {
        order_number: generateOrderNumber(),
        status: OrderStatus.PENDING,
        total_amount: totalAmount,
      });
      await queryRunner.manager.save(Order, order);

      // Step 5: Create order items
      const orderItems = orderItemsData.map(({ product, quantity }) =>
        queryRunner.manager.create(OrderItem, {
          order_id: order.id,
          product_id: product.id,
          quantity,
          unit_price: product.price,
        })
      );
      await queryRunner.manager.save(OrderItem, orderItems);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return order with items
      return await this.getOrderById(order.id);
    } catch (error) {
      // Rollback on any error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Get Orders with Filters and Pagination
   */
  async getOrders(filters: {
    status?: OrderStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: FindOptionsWhere<Order> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.from || filters.to) {
      where.created_at = Between(
        filters.from ? new Date(filters.from) : new Date('1970-01-01'),
        filters.to ? new Date(filters.to) : new Date()
      );
    }

    const [orders, total] = await AppDataSource.getRepository(Order).findAndCount({
      where,
      relations: ['items', 'items.product'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    // Add item count to each order
    const ordersWithCount = orders.map((order) => ({
      ...order,
      item_count: order.items.length,
    }));

    return {
      orders: ordersWithCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel Order and Restore Stock
   */
  async cancelOrder(orderId: number): Promise<Order> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Find order with items
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Step 2: Check if cancellable
      if (order.status === OrderStatus.CANCELLED) {
        throw new AppError('Order is already cancelled', 400);
      }

      if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
        throw new AppError('Only PENDING or CONFIRMED orders can be cancelled', 400);
      }

      // Step 3: Restore stock quantities
      for (const item of order.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.product_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (product) {
          product.stock_qty += item.quantity;
          await queryRunner.manager.save(Product, product);
        }
      }

      // Step 4: Update order status
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return await this.getOrderById(order.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Helper: Get Order by ID
   */
  private async getOrderById(orderId: number): Promise<Order> {
    const order = await AppDataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    return order;
  }
}