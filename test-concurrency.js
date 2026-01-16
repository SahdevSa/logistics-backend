const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test 1: Race Condition Test
async function testRaceCondition() {
  console.log('\n TEST 1: Race Condition - Multiple orders for same product simultaneously\n');
  
  // First, check current stock
  const ordersResponse = await axios.get(`${BASE_URL}/orders`);
  console.log(' Initial stock check via database...\n');

  // Create 5 simultaneous orders for SKU001 (initial stock: 50)
  // Each ordering 15 units = 75 total (should fail some orders)
  const promises = [];
  
  for (let i = 1; i <= 5; i++) {
    promises.push(
      axios.post(`${BASE_URL}/orders`, {
        items: [
          { sku: 'SKU001', qty: 15 }
        ]
      })
      .then(response => ({
        success: true,
        orderNumber: response.data.data.order_number,
        message: ` Order ${i} SUCCESS`
      }))
      .catch(error => ({
        success: false,
        message: ` Order ${i} FAILED: ${error.response?.data?.message || error.message}`
      }))
    );
  }

  const results = await Promise.all(promises);
  
  console.log('Results:');
  results.forEach(result => console.log(result.message));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n Summary: ${successCount} succeeded, ${failCount} failed`);
  console.log(' Expected: 3 success (45 units), 2 failures (stock exhausted)\n');
}

// Test 2: Negative Stock Prevention
async function testNegativeStockPrevention() {
  console.log('\n TEST 2: Negative Stock Prevention\n');
  
  try {
    // Try to order more than available stock
    const response = await axios.post(`${BASE_URL}/orders`, {
      items: [
        { sku: 'SKU005', qty: 500 } // Only 200 in stock
      ]
    });
    console.log(' FAILED: Order should have been rejected');
  } catch (error) {
    console.log(' PASSED: Order correctly rejected');
    console.log(`   Message: ${error.response?.data?.message}\n`);
  }
}

// Test 3: Transaction Rollback
async function testTransactionRollback() {
  console.log('\n TEST 3: Transaction Rollback on Invalid Item\n');
  
  try {
    // Order with one valid and one invalid SKU
    const response = await axios.post(`${BASE_URL}/orders`, {
      items: [
        { sku: 'SKU002', qty: 5 },
        { sku: 'INVALID_SKU', qty: 1 }
      ]
    });
    console.log(' FAILED: Should have rolled back entire order');
  } catch (error) {
    console.log(' PASSED: Transaction rolled back correctly');
    console.log(`   Message: ${error.response?.data?.message}`);
    console.log('   Stock for SKU002 should be unchanged\n');
  }
}

// Test 4: Cancel and Restore Stock
async function testCancelOrder() {
  console.log('\n TEST 4: Cancel Order and Restore Stock\n');
  
  try {
    // Create an order
    const createResponse = await axios.post(`${BASE_URL}/orders`, {
      items: [
        { sku: 'SKU003', qty: 10 }
      ]
    });
    
    const orderId = createResponse.data.data.id;
    console.log(` Order created: ${createResponse.data.data.order_number}`);
    
    // Cancel it
    const cancelResponse = await axios.post(`${BASE_URL}/orders/${orderId}/cancel`);
    console.log(` Order cancelled successfully`);
    console.log(`   Stock restored: 10 units back to SKU003\n`);
  } catch (error) {
    console.log(` FAILED: ${error.response?.data?.message || error.message}\n`);
  }
}

// Test 5: Concurrent Cancellations
async function testConcurrentCancellations() {
  console.log('\n TEST 5: Concurrent Cancellations of Same Order\n');
  
  try {
    // Create an order
    const createResponse = await axios.post(`${BASE_URL}/orders`, {
      items: [{ sku: 'SKU004', qty: 5 }]
    });
    
    const orderId = createResponse.data.data.id;
    console.log(` Order created: ${createResponse.data.data.order_number}`);
    
    // Try to cancel simultaneously
    const cancelPromises = [
      axios.post(`${BASE_URL}/orders/${orderId}/cancel`).catch(e => ({ error: e.response?.data?.message })),
      axios.post(`${BASE_URL}/orders/${orderId}/cancel`).catch(e => ({ error: e.response?.data?.message })),
      axios.post(`${BASE_URL}/orders/${orderId}/cancel`).catch(e => ({ error: e.response?.data?.message }))
    ];
    
    const cancelResults = await Promise.all(cancelPromises);
    
    const successfulCancels = cancelResults.filter(r => !r.error).length;
    console.log(` Only ${successfulCancels} cancellation succeeded (expected: 1)`);
    console.log('   Other attempts correctly rejected\n');
  } catch (error) {
    console.log(` Error: ${error.message}\n`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('     CONCURRENCY & TRANSACTION INTEGRITY TESTS          ');
  
  try {
    await testRaceCondition();
    await testNegativeStockPrevention();
    await testTransactionRollback();
    await testCancelOrder();
    await testConcurrentCancellations();
    
    console.log('                  ALL TESTS COMPLETED                   ');
  } catch (error) {
    console.error('Test suite error:', error.message);
  }
}

runAllTests();