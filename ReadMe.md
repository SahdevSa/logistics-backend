# Logistics Order Management System

A backend service for managing products, orders, and inventory with proper transaction handling and concurrency control.

Built with Node.js, Express, TypeORM, and MySQL.

---

## What This Does

This system handles:

- Creating orders with automatic stock deduction
- Preventing race conditions when multiple orders happen simultaneously
- Cancelling orders and restoring inventory
- Filtering and paginating order lists

The main challenge here was handling concurrent requests safely - making sure we don't oversell products when multiple people order at the same time.

---

## Tech Stack

- **Node.js** 18+
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **TypeORM** - Database ORM with transaction support
- **MySQL** 8.0+ - Database
- **class-validator** - Request validation

---

## Project Structure

logistics-backend/
├── src/
│ ├── config/
│ │ └── database.ts # Database connection setup
│ ├── entities/
│ │ ├── Product.entity.ts # Product model
│ │ ├── Order.entity.ts # Order model
│ │ └── OrderItem.entity.ts # Order items model
│ ├── migrations/
│ │ └── [timestamp]-InitialSchema.ts
│ ├── services/
│ │ └── order.service.ts # Business logic (transactions here)
│ ├── controllers/
│ │ └── order.controller.ts # Request handlers
│ ├── dto/
│ │ ├── create-order.dto.ts # Input validation
│ │ └── get-orders.dto.ts
│ ├── middlewares/
│ │ ├── errorHandler.ts # Error handling
│ │ └── validator.ts # DTO validation
│ ├── routes/
│ │ └── order.routes.ts # API routes
│ ├── utils/
│ │ ├── response.ts # Response formatting
│ │ └── orderNumberGenerator.ts
│ ├── app.ts # Express app setup
│ └── server.ts # Entry point
├── test-concurrency.js # Concurrency tests
├── DESIGN_ANSWERS.md # Design question answers
├── BUG_FIX_EXPLANATION.md # Concurrency bug explanation
├── .env # Environment variables (not in git)
├── .env.example # Example env file
├── package.json
├── tsconfig.json
└── README.md # You are here

## Getting Started

### Prerequisites

You need these installed:

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm (comes with Node.js)

Check if you have them:

```bash
node --version
mysql --version
```

1. Clone or download this project
   cd logistics-backend

2. Install dependencies
   Install dependencies

3. Set up the database
   mysql -u root -p
   Create the database:
   CREATE DATABASE logistics_db;
   EXIT;

4. Configure environment variables
   cp .env.example .env

   Edit .env and update with your MySQL password:
   NODE_ENV=development
   PORT=3000

   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=your_mysql_password_here
   DB_DATABASE=logistics_db

5. Run database migrations
   npm run migration:run
   This creates the tables and adds some sample products.

6. Start the server
   npm run dev
   You should see:
   Database connected successfully
   Server running on http://localhost:3000

## API Endpoints: Use Postman or similar app

1. Create a new order and deduct stock automatically.
   POST http://localhost:3000/orders
   {
   "items": [
   { "sku": "SKU001", "qty": 2 },
   { "sku": "SKU002", "qty": 1 }
   ]
   }

2. Get Orders
   Retrieve orders with filtering, sorting, and pagination.
   GET http://localhost:3000/orders?status=PENDING&page=1&limit=10

   Query Parameters:

   status (optional) - Filter by status: PENDING, CONFIRMED, or CANCELLED
   from (optional) - Start date (ISO format): 2024-01-01
   to (optional) - End date (ISO format): 2024-12-31
   page (optional) - Page number, default: 1
   limit (optional) - Items per page, default: 10

   For Example
   GET /orders
   GET /orders?status=PENDING
   GET /orders?from=2024-01-01&to=2024-12-31
   GET /orders?status=CONFIRMED&page=2&limit=20

3. Cancel Order
   Cancel an order and restore the stock.
   POST http://localhost:3000/orders/1/cancel
   Response Looks like this.....

Success Response (200):
{
"success": true,
"message": "Order cancelled successfully",
"data": {
"id": 1,
"order_number": "ORD-1737012345-123",
"status": "CANCELLED",
"total_amount": "2699.97",
"items": [...]
}
}

Error Responses:

Order not found (404):
{
"success": false,
"message": "Order not found"
}

Already cancelled (400):
{
"success": false,
"message": "Order is already cancelled"
}

Can't cancel (400):
{
"success": false,
"message": "Only PENDING or CONFIRMED orders can be cancelled"
}

What happens:

    Locks the order and product rows
    Checks if order can be cancelled
    Adds quantities back to product stock
    Updates order status to CANCELLED
    Rolls back if anything fails

## Testing

Create an order:
curl -X POST http://localhost:3000/orders \
 -H "Content-Type: application/json" \
 -d '{
"items": [
{ "sku": "SKU001", "qty": 2 }
]
}'

Get all orders:
curl http://localhost:3000/orders

Get pending orders:
curl http://localhost:3000/orders?status=PENDING

Cancel an order:
curl -X POST http://localhost:3000/orders/1/cancel

## Concurrency Testing

This is important - tests that multiple simultaneous orders don't cause overselling.

First install axios:
npm install axios

Run the test:
node test-concurrency.js

The test will:

    Send 5 simultaneous orders for the same product
    Verify no negative stock occurs
    Test transaction rollbacks
    Test concurrent cancellations

==============================================

# Database Schema

1. Products Table
   CREATE TABLE products (
   id INT PRIMARY KEY AUTO_INCREMENT,
   name VARCHAR(255) NOT NULL,
   sku VARCHAR(100) UNIQUE NOT NULL,
   stock_qty INT DEFAULT 0,
   price DECIMAL(10,2) NOT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_sku (sku)
   );

2. Orders Table
   CREATE TABLE orders (
   id INT PRIMARY KEY AUTO_INCREMENT,
   order_number VARCHAR(100) UNIQUE NOT NULL,
   status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
   total_amount DECIMAL(10,2) NOT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_status (status),
   INDEX idx_created_at (created_at),
   INDEX idx_order_number (order_number)
   );

3. Order Items Table

CREATE TABLE order_items (
id INT PRIMARY KEY AUTO_INCREMENT,
order_id INT NOT NULL,
product_id INT NOT NULL,
quantity INT NOT NULL,
unit_price DECIMAL(10,2) NOT NULL,
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
FOREIGN KEY (product_id) REFERENCES products(id),
INDEX idx_order_id (order_id),
INDEX idx_product_id (product_id)
);

Sample Data

After running migrations, you'll have these products:

    SKU001: Laptop Dell XPS 13 (50 units, $1299.99)
    SKU002: Mouse Logitech MX Master (100 units, $99.99)
    SKU003: Keyboard Mechanical RGB (75 units, $149.99)
    SKU004: Monitor 27" 4K (30 units, $499.99)
    SKU005: Webcam HD 1080p (200 units, $79.99)

# Architecture Decisions

Why TypeORM?

    Better TypeScript support than Sequelize
    Built-in transaction support with QueryRunner
    Pessimistic locking support
    Cleaner entity definitions with decorators

Why Pessimistic Locking?

    Guaranteed correctness for inventory management
    Can do complex validation during transaction
    Clear error messages
    Acceptable performance tradeoff for this use case

Why Layered Architecture?

    Controllers (handle HTTP)

        . Services (business logic + transactions)
        . Entities (database models)

    Clear separation of concerns
    Easy to test each layer
    Business logic isolated from HTTP details

# Available Scripts

npm run dev # Start development server with auto-reload
npm run build # Compile TypeScript to JavaScript
npm start # Run compiled JavaScript (production)
npm run migration:run # Run database migrations

# Environment Variables

NODE_ENV=development # development or production
PORT=3000 # Server port

DB_HOST=localhost # Database host
DB_PORT=3306 # Database port
DB_USERNAME=root # Database user
DB_PASSWORD=your_password # Database password
DB_DATABASE=logistics_db # Database name
