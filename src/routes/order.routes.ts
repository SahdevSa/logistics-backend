import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateDto } from '../middlewares/validator';
import { CreateOrderDto } from '../dto/create-order.dto';

const router = Router();
const orderController = new OrderController();

// POST /orders - Create order
router.post('/', validateDto(CreateOrderDto), orderController.createOrder);

// GET /orders - Get orders with filters
router.get('/', orderController.getOrders);

// POST /orders/:id/cancel - Cancel order
router.post('/:id/cancel', orderController.cancelOrder);

export default router;