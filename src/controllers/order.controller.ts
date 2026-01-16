import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { ApiResponse } from '../utils/response';
import { CreateOrderDto } from '../dto/create-order.dto';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * POST /orders - Create new order
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createOrderDto: CreateOrderDto = req.body;
      const order = await this.orderService.createOrder(createOrderDto);

      res.status(201).json(
        ApiResponse.success('Order created successfully', order)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders - Get orders with filters
   */
  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, from, to, page, limit } = req.query;

      const result = await this.orderService.getOrders({
        status: status as any,
        from: from as string,
        to: to as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });

      res.status(200).json(
        ApiResponse.success('Orders retrieved successfully', result)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /orders/:id/cancel - Cancel order
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.id);

      if (isNaN(orderId)) {
        return res.status(400).json(
          ApiResponse.error('Invalid order ID')
        );
      }

      const order = await this.orderService.cancelOrder(orderId);

      res.status(200).json(
        ApiResponse.success('Order cancelled successfully', order)
      );
    } catch (error) {
      next(error);
    }
  };
}
