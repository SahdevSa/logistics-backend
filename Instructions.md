# Step 1: Install Node.js and MySQL

# Download Node.js from https://nodejs.org/

# Download MySQL from https://dev.mysql.com/downloads/

# Verify installations

node --version
mysql --version

# Step 2: Clone/Download project

cd logistics-backend

# Step 3: Install dependencies

npm install

# Step 4: Create database

mysql -u root -p
CREATE DATABASE logistics_db;
EXIT;

# Step 5: Configure environment

cp .env.example .env

# Edit .env and update DB_PASSWORD with your MySQL password

# Step 6: Run migrations

npm run migration:run

# Step 7: Start server

npm run dev

# Server will run at http://localhost:3000

# Step 8: Test APIs (in another terminal)

# Health check

curl http://localhost:3000/health

# Create order

curl -X POST http://localhost:3000/orders \
 -H "Content-Type: application/json" \
 -d '{"items":[{"sku":"SKU001","qty":2}]}'

# Get orders

curl http://localhost:3000/orders

# Cancel order (replace 1 with actual order ID)

curl -X POST http://localhost:3000/orders/1/cancel

# Step 9: Run concurrency tests

npm install axios
node test-concurrency.js

# Step 10: Stop server

# Press Ctrl+C in the terminal where server is running
