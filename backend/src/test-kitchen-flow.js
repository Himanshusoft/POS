/**
 * Comprehensive Automated End-to-End Test Suite for Kitchen Admin Module.
 * Validates all 25 minimum scenarios specified in Requirement 39.
 */

import { prisma } from './config/env.js';

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message, context) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    if (context) console.error('   Context:', typeof context === 'object' ? JSON.stringify(context, null, 2) : context);
    throw new Error(message);
  } else {
    passedTests++;
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log(' STARTING KITCHEN ADMIN VERIFICATION TEST SUITE (25 SCENARIOS)');
  console.log('===============================================================\n');

  // Step 0: Ensure database has test data (Chef, Waiter, Restaurant)
  import('bcryptjs');
  const bcrypt = (await import('bcryptjs')).default;
  const testPassword = await bcrypt.hash('Password123', 10);

  let chefUser = await prisma.user.findFirst({
    where: { role: 'KITCHEN_ADMIN', restaurantId: { not: null } },
    include: { restaurant: true },
  });

  if (!chefUser) {
    let rest = await prisma.restaurant.findFirst();
    chefUser = await prisma.user.create({
      data: {
        restaurantId: rest.id,
        name: 'Chef Marco',
        email: 'chef.marco@pos.com',
        password: testPassword,
        role: 'KITCHEN_ADMIN',
      },
      include: { restaurant: true },
    });
  } else {
    await prisma.user.update({
      where: { id: chefUser.id },
      data: { password: testPassword },
    });
  }

  const restaurantId = chefUser.restaurantId;

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { isActive: true },
  });

  await prisma.user.update({
    where: { id: chefUser.id },
    data: { isActive: true },
  });

  let waiterUser = await prisma.user.findFirst({
    where: { role: 'WAITER', restaurantId },
  });

  if (!waiterUser) {
    waiterUser = await prisma.user.create({
      data: {
        restaurantId,
        name: 'Alex Waiter',
        email: 'alex.waiter@pos.com',
        password: testPassword,
        role: 'WAITER',
        isActive: true,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: waiterUser.id },
      data: { password: testPassword, isActive: true },
    });
  }

  assert(chefUser && waiterUser, 'Valid Chef and Waiter users resolved in database');

  // 1. Kitchen Admin Login
  const chefLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: chefUser.email, password: 'Password123' },
  });
  assert(chefLogin.status === 200 && chefLogin.data.data?.token, '1. Kitchen Admin login succeeds with valid JWT', chefLogin);
  const chefToken = chefLogin.data.data.token;
  assert(chefLogin.data.data.user.role === 'KITCHEN_ADMIN', '1. User role is strictly KITCHEN_ADMIN');

  // Waiter Login
  const waiterLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: waiterUser.email, password: 'Password123' },
  });
  assert(waiterLogin.status === 200 && waiterLogin.data.data?.token, 'Waiter login succeeds');
  const waiterToken = waiterLogin.data.data.token;

  // 2. Kitchen Admin Dashboard
  const dashboardRes = await request('/kitchen/dashboard', {
    method: 'GET',
    token: chefToken,
  });
  assert(dashboardRes.status === 200 && dashboardRes.data.data?.kpis, '2. Kitchen Admin dashboard returns live KPIs');
  assert(typeof dashboardRes.data.data.kpis.newOrders === 'number', '2. Live newOrders KPI is a number from DB');
  assert(Array.isArray(dashboardRes.data.data.tableOrders), '2. Live tableOrders array is returned');

  // 3. Multi-tenant setup: Create a second restaurant to test tenant isolation
  let restB = await prisma.restaurant.findFirst({ where: { name: 'Tenant B Bistro' } });
  if (!restB) {
    restB = await prisma.restaurant.create({
      data: {
        name: 'Tenant B Bistro',
        address: '456 Second Ave',
        email: 'tenantb@pos.com',
      },
    });
  }

  // Find or create Chef B
  let chefB = await prisma.user.findUnique({ where: { email: 'chefb@pos.com' } });
  if (!chefB) {
    chefB = await prisma.user.create({
      data: {
        restaurantId: restB.id,
        name: 'Chef Bruno',
        email: 'chefb@pos.com',
        password: chefUser.password,
        role: 'KITCHEN_ADMIN',
      },
    });
  }
  const chefBLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'chefb@pos.com', password: 'Password123' },
  });
  const chefBToken = chefBLogin.data.data.token;

  // 3. Kitchen Admin sees only own restaurant orders
  const ordersChefA = await request('/kitchen/orders', { method: 'GET', token: chefToken });
  const ordersChefB = await request('/kitchen/orders', { method: 'GET', token: chefBToken });
  assert(ordersChefA.status === 200 && ordersChefB.status === 200, '3. Orders retrieved for both tenants');
  const itemsA = ordersChefA.data.data?.items || ordersChefA.data.data || [];
  assert(itemsA.every((o) => o.restaurantId === restaurantId), '3. Kitchen Admin A sees only Restaurant A orders');

  // 4. Waiter creates order
  // Find or create table and menu item in restaurant A
  let table = await prisma.table.findFirst({ where: { restaurantId } });
  if (!table) {
    table = await prisma.table.create({
      data: { restaurantId, tableNumber: 'T-10', capacity: 4, status: 'AVAILABLE' },
    });
  } else {
    await prisma.order.updateMany({
      where: { tableId: table.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      data: { status: 'CANCELLED' },
    });
    table = await prisma.table.update({
      where: { id: table.id },
      data: { status: 'AVAILABLE' },
    });
  }

  let rotiItem = await prisma.menuItem.findFirst({ where: { restaurantId, name: 'Tandoori Roti' } });
  if (!rotiItem) {
    rotiItem = await prisma.menuItem.create({
      data: {
        restaurantId,
        name: 'Tandoori Roti',
        price: 2.5,
        isAvailable: true,
      },
    });
  }
  assert(table && rotiItem, 'Table and Tandoori Roti exist for ordering');

  // Check flour inventory before order
  let flourBefore = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: { contains: 'Flour', mode: 'insensitive' } } });
  if (!flourBefore) {
    flourBefore = await prisma.inventoryItem.create({
      data: {
        restaurantId,
        name: 'Wheat Flour',
        currentStock: 10.0,
        minStockThreshold: 2.0,
        unit: 'KG',
      },
    });
  } else {
    await prisma.inventoryItem.update({
      where: { id: flourBefore.id },
      data: { currentStock: 10.0, unit: 'KG' },
    });
  }
  assert(flourBefore, 'Flour inventory item exists');

  // Ensure recipe for Tandoori Roti has 100g (0.1 kg) flour per roti or 0.1 KG
  let rotiRecipe = await prisma.recipe.findUnique({ where: { menuItemId: rotiItem.id }, include: { ingredients: true } });
  if (!rotiRecipe) {
    rotiRecipe = await prisma.recipe.create({
      data: {
        menuItemId: rotiItem.id,
        instructions: 'Cook in tandoor',
        prepTime: 10,
        ingredients: {
          create: [{ inventoryItemId: flourBefore.id, quantityRequired: 100, unit: 'GRAM' }],
        },
      },
      include: { ingredients: true },
    });
  } else {
    // Update recipe to 100 GRAM per unit to test unit conversion (100g x 10 = 1000g = 1kg)
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: rotiRecipe.id } });
    await prisma.recipeIngredient.create({
      data: {
        recipeId: rotiRecipe.id,
        inventoryItemId: flourBefore.id,
        quantityRequired: 100,
        unit: 'GRAM',
      },
    });
  }

  // 4. Waiter creates order (10 Tandoori Roti)
  const createOrderRes = await request('/orders', {
    method: 'POST',
    token: waiterToken,
    body: {
      tableId: table.id,
      items: [{ menuItemId: rotiItem.id, quantity: 10 }],
      notes: 'Crispy roti please',
    },
  });
  assert(createOrderRes.status === 201, '4. Waiter creates order for 10 Tandoori Roti');
  const createdOrder = createOrderRes.data.data;
  assert(createdOrder.status === 'PENDING', '4. Order is created in PENDING status');
  const orderId = createdOrder.id;

  // 5. Waiter sends order to kitchen (implicit via order creation / queue)
  assert(createdOrder.orderNumber.startsWith('ORD-'), '5. Order has unique ORD- identifier');

  // 6. Kitchen Admin receives order in pending queue
  const pendingOrdersRes = await request('/kitchen/orders/pending', { method: 'GET', token: chefToken });
  assert(pendingOrdersRes.status === 200, '6. Kitchen Admin fetches pending orders');
  const pendingItems = pendingOrdersRes.data.data?.items || pendingOrdersRes.data.data || [];
  const foundInPending = pendingItems.some((o) => o.id === orderId);
  assert(foundInPending, '6. Kitchen Admin receives Waiter order in queue');

  // 7. Kitchen Admin accepts order
  const acceptRes = await request(`/kitchen/orders/${orderId}/accept`, {
    method: 'PATCH',
    token: chefToken,
  });
  assert(acceptRes.status === 200 && acceptRes.data.data.status === 'ACCEPTED', '7. Kitchen Admin accepts order (status -> ACCEPTED)');

  // 8. Kitchen Admin changes status to PREPARING
  const prepRes = await request(`/kitchen/orders/${orderId}/prepare`, {
    method: 'PATCH',
    token: chefToken,
  });
  assert(prepRes.status === 200 && prepRes.data.data.status === 'IN_PREPARATION', '8. Kitchen Admin starts cooking (status -> IN_PREPARATION)');

  // 9. Recipe exists check
  const orderDetail = await request(`/kitchen/orders/${orderId}`, { method: 'GET', token: chefToken });
  assert(orderDetail.status === 200 && !orderDetail.data.data.hasMissingRecipe, '9. Recipe exists and is verified for ordered dishes');

  // 10. Inventory is sufficient check
  assert(orderDetail.data.data.calculatedIngredients.every((i) => i.isSufficient), '10. Calculated recipe ingredients confirmed sufficient before completion');

  // 11. Kitchen Admin marks READY
  const readyRes = await request(`/kitchen/orders/${orderId}/ready`, {
    method: 'PATCH',
    token: chefToken,
  });
  assert(readyRes.status === 200 && readyRes.data.data.status === 'READY', '11. Kitchen Admin marks order READY', readyRes);
  assert(readyRes.data.data.inventoryDeducted === true, '11. Order inventoryDeducted flag set to true');

  // 12. Inventory automatically deducts (100g x 10 = 1kg deducted: 10kg -> 9kg)
  const flourAfter = await prisma.inventoryItem.findUnique({ where: { id: flourBefore.id } });
  const expectedStock = 9.0;
  assert(Math.abs(Number(flourAfter.currentStock) - expectedStock) < 0.001, `12. Inventory automatically deducted 1 kg: 10 kg -> ${Number(flourAfter.currentStock)} kg`);

  // 13. Inventory transaction created
  const txRecord = await prisma.inventoryTransaction.findFirst({
    where: { orderId, inventoryItemId: flourBefore.id, type: 'CONSUMPTION' },
  });
  assert(txRecord !== null, '13. InventoryTransaction record created with type CONSUMPTION');
  assert(Number(txRecord.previousBalance) === 10.0, '13. Previous balance logged as 10.0');
  assert(Number(txRecord.remainingBalance) === 9.0, '13. Remaining balance logged as 9.0');
  assert(Number(txRecord.quantity) === -1.0, '13. Transaction quantity logged as -1.0');
  assert(txRecord.reference.includes(createdOrder.orderNumber), '13. Order reference correctly attached');

  // 14. Waiter sees READY status
  const waiterOrderView = await request(`/orders/${orderId}`, { method: 'GET', token: waiterToken });
  assert(waiterOrderView.status === 200 && waiterOrderView.data.data.status === 'READY', '14. Waiter sees order in READY status');

  // 15. Waiter serves customer
  const serveRes = await request(`/orders/${orderId}/served`, {
    method: 'PATCH',
    token: waiterToken,
  });
  assert(serveRes.status === 200 && serveRes.data.data.status === 'SERVED', '15. Waiter marks order as SERVED to customer');

  // 16. Repeated READY request does not deduct twice (Idempotency)
  // Attempt to mark READY again
  const repeatedReady = await request(`/kitchen/orders/${orderId}/ready`, {
    method: 'PATCH',
    token: chefToken,
  });
  const flourAfterRepeated = await prisma.inventoryItem.findUnique({ where: { id: flourBefore.id } });
  assert(Math.abs(Number(flourAfterRepeated.currentStock) - expectedStock) < 0.001, '16. Idempotency verified: repeated READY does not deduct stock again');

  // 17. Insufficient inventory is handled
  // Create an item with huge requirement
  const lowItem = await prisma.inventoryItem.create({
    data: {
      restaurantId,
      name: `Expensive Truffle ${Date.now().toString().slice(-4)}`,
      currentStock: 1.0,
      minStockThreshold: 1.0,
      unit: 'KG',
    },
  });
  const truffleDish = await prisma.menuItem.create({
    data: {
      restaurantId,
      name: `Truffle Pasta ${Date.now().toString().slice(-4)}`,
      price: 50.0,
    },
  });
  await prisma.recipe.create({
    data: {
      menuItemId: truffleDish.id,
      prepTime: 15,
      ingredients: {
        create: [{ inventoryItemId: lowItem.id, quantityRequired: 0.5, unit: 'KG' }],
      },
    },
  });

  const table2 = await prisma.table.create({
    data: { restaurantId, tableNumber: `T-INSUFF-${Date.now().toString().slice(-5)}`, status: 'AVAILABLE' },
  });

  const insuffOrder = await request('/orders', {
    method: 'POST',
    token: waiterToken,
    body: { tableId: table2.id, items: [{ menuItemId: truffleDish.id, quantity: 1 }] },
  });
  const insuffOrderId = insuffOrder.data.data.id;
  await request(`/kitchen/orders/${insuffOrderId}/accept`, { method: 'PATCH', token: chefToken });
  await request(`/kitchen/orders/${insuffOrderId}/prepare`, { method: 'PATCH', token: chefToken });

  // Simulate stock dropping while in preparation (e.g. spoilage or manual deduction)
  await prisma.inventoryItem.update({
    where: { id: lowItem.id },
    data: { currentStock: 0.1 },
  });

  const failReady = await request(`/kitchen/orders/${insuffOrderId}/ready`, {
    method: 'PATCH',
    token: chefToken,
  });
  assert(failReady.status === 400 && failReady.data.message.includes('Insufficient inventory'), '17. Insufficient inventory correctly rejected with 400 and clear message');

  // 18. Missing recipe is handled
  const noRecipeDish = await prisma.menuItem.create({
    data: { restaurantId, name: `Mystery Special ${Date.now().toString().slice(-4)}`, price: 20.0 },
  });
  const tableNoRecipe = await prisma.table.create({
    data: { restaurantId, tableNumber: `T-NOREC-${Date.now().toString().slice(-5)}`, status: 'AVAILABLE' },
  });
  const noRecipeOrder = await prisma.order.create({
    data: {
      restaurantId,
      tableId: tableNoRecipe.id,
      waiterId: waiterUser.id,
      orderNumber: `ORD-NOREC-${Date.now().toString().slice(-4)}`,
      status: 'IN_PREPARATION',
      items: {
        create: [{ menuItemId: noRecipeDish.id, quantity: 1, unitPrice: 20, subtotal: 20, status: 'COOKING' }],
      },
    },
  });
  const noRecipeOrderId = noRecipeOrder.id;

  const failNoRecipe = await request(`/kitchen/orders/${noRecipeOrderId}/ready`, {
    method: 'PATCH',
    token: chefToken,
  });
  assert(failNoRecipe.status === 400 && failNoRecipe.data.message.includes('Recipe is not configured'), '18. Missing recipe correctly rejected with clear configuration warning');

  // 19. Invalid status transition is rejected
  // Try jumping PENDING -> SERVED directly
  const jumpOrder = await request('/orders', {
    method: 'POST',
    token: waiterToken,
    body: { tableId: table2.id, items: [{ menuItemId: rotiItem.id, quantity: 1 }] },
  });
  const jumpOrderId = jumpOrder.data.data.id;

  const illegalJump = await request(`/kitchen/orders/${jumpOrderId}/status`, {
    method: 'PATCH',
    token: chefToken,
    body: { status: 'SERVED' },
  });
  assert(illegalJump.status === 409, '19. Illegal status transition (PENDING -> SERVED) is rejected with 409');

  // 20. Restaurant A cannot access Restaurant B data
  const accessBFromA = await request(`/kitchen/orders/${insuffOrderId}`, {
    method: 'GET',
    token: chefBToken, // Chef B accessing Order in Restaurant A
  });
  assert(accessBFromA.status === 404, '20. Multi-tenant isolation verified: Chef B cannot view Restaurant A order');

  // 21. Non-Kitchen Admin cannot access Kitchen Admin APIs
  const waiterAccessKitchen = await request('/kitchen/dashboard', {
    method: 'GET',
    token: waiterToken,
  });
  assert(waiterAccessKitchen.status === 403, '21. RBAC enforced: WAITER role is forbidden from accessing Kitchen Admin APIs (403)');

  // 22. Historical order remains accessible
  const historicalOrder = await request(`/kitchen/orders/${orderId}`, {
    method: 'GET',
    token: chefToken,
  });
  assert(historicalOrder.status === 200 && historicalOrder.data.data.id === orderId, '22. Completed/historical order remains fully accessible');

  // 23. Recipe can be created/updated correctly
  const recipeCreate = await request('/recipes', {
    method: 'POST',
    token: chefToken,
    body: {
      menuItemId: noRecipeDish.id,
      instructions: 'Chef Marco secret spices',
      prepTime: 12,
      ingredients: [{ inventoryItemId: flourBefore.id, quantityRequired: 50, unit: 'GRAM' }],
    },
  });
  assert(recipeCreate.status === 201 || recipeCreate.status === 200, '23. Kitchen Admin can create/update recipes for menu items');

  // 24. Multiple ingredients calculated correctly
  let oilItem = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: { contains: 'Oil', mode: 'insensitive' }, unit: { in: ['LITER', 'MILLILITER'] } } });
  if (!oilItem) {
    oilItem = await prisma.inventoryItem.create({
      data: {
        restaurantId,
        name: 'Cooking Oil',
        currentStock: 20.0,
        minStockThreshold: 5.0,
        unit: 'LITER',
      },
    });
  }
  assert(oilItem, 'Cooking Oil item exists for multi-ingredient test');

  const multiDish = await prisma.menuItem.create({
    data: { restaurantId, name: `Paratha ${Date.now().toString().slice(-4)}`, price: 4.0 },
  });
  await prisma.recipe.create({
    data: {
      menuItemId: multiDish.id,
      prepTime: 8,
      ingredients: {
        create: [
          { inventoryItemId: flourBefore.id, quantityRequired: 150, unit: 'GRAM' }, // 150g flour
          { inventoryItemId: oilItem.id, quantityRequired: 20, unit: 'MILLILITER' }, // 20ml oil
        ],
      },
    },
  });

  // 25. Multiple quantities of dish calculated correctly
  // Order 2 Parathas: 2 x 150g = 300g = 0.3kg flour, 2 x 20ml = 40ml = 0.04L oil
  const flourStockBeforeParatha = Number((await prisma.inventoryItem.findUnique({ where: { id: flourBefore.id } })).currentStock);
  const oilStockBeforeParatha = Number((await prisma.inventoryItem.findUnique({ where: { id: oilItem.id } })).currentStock);

  const tableMulti = await prisma.table.create({
    data: { restaurantId, tableNumber: `T-MULTI-${Date.now().toString().slice(-5)}`, status: 'AVAILABLE' },
  });

  const parathaOrder = await request('/orders', {
    method: 'POST',
    token: waiterToken,
    body: { tableId: tableMulti.id, items: [{ menuItemId: multiDish.id, quantity: 2 }] },
  });
  const pOrderId = parathaOrder.data.data.id;
  await request(`/kitchen/orders/${pOrderId}/accept`, { method: 'PATCH', token: chefToken });
  await request(`/kitchen/orders/${pOrderId}/prepare`, { method: 'PATCH', token: chefToken });
  const pReady = await request(`/kitchen/orders/${pOrderId}/ready`, { method: 'PATCH', token: chefToken });
  assert(pReady.status === 200, '24 & 25. Multiple ingredients and multiple quantities marked READY successfully', pReady);

  const flourStockAfterParatha = Number((await prisma.inventoryItem.findUnique({ where: { id: flourBefore.id } })).currentStock);
  const oilStockAfterParatha = Number((await prisma.inventoryItem.findUnique({ where: { id: oilItem.id } })).currentStock);

  assert(Math.abs(flourStockBeforeParatha - flourStockAfterParatha - 0.3) < 0.001, '25. Multi-quantity flour deducted exactly: 2 x 150g = 0.3kg');
  assert(Math.abs(oilStockBeforeParatha - oilStockAfterParatha - 0.04) < 0.001, '24. Multi-ingredient volume converted and deducted exactly: 2 x 20ml = 0.04L');

  // 25b. Complete lifecycle: Waiter serves food, Receptionist bills & settles, Table released
  const pServe = await request(`/orders/${pOrderId}/served`, { method: 'PATCH', token: waiterToken });
  assert(pServe.status === 200 && pServe.data.data.status === 'SERVED', '25b. Waiter marks order SERVED');

  let recUser = await prisma.user.findFirst({ where: { role: 'RECEPTIONIST', restaurantId } });
  if (!recUser) {
    recUser = await prisma.user.create({
      data: {
        restaurantId,
        name: 'Rachel Frontdesk',
        email: `receptionist-${Date.now()}@pos.com`,
        password: testPassword,
        role: 'RECEPTIONIST',
        isActive: true,
      },
    });
  } else {
    await prisma.user.update({ where: { id: recUser.id }, data: { password: testPassword, isActive: true } });
  }

  const recLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: recUser.email, password: 'Password123' },
  });
  const recToken = recLogin.data.data.token;

  const billRes = await request('/billing/generate', {
    method: 'POST',
    token: recToken,
    body: { orderId: pOrderId },
  });
  assert(billRes.status === 201 || billRes.status === 200, '25c. Receptionist generates bill for served order', billRes);
  const billData = billRes.data.data;

  const payRes = await request('/payments', {
    method: 'POST',
    token: recToken,
    body: { billId: billData.id, amount: Number(billData.totalAmount), method: 'CASH' },
  });
  assert(payRes.status === 201 || payRes.status === 200, '25d. Receptionist settles payment for bill', payRes);

  const completedOrder = await prisma.order.findUnique({ where: { id: pOrderId } });
  const releasedTable = await prisma.table.findUnique({ where: { id: tableMulti.id } });
  assert(completedOrder.status === 'COMPLETED', '25e. Order automatically marked COMPLETED upon bill settlement');
  assert(releasedTable.status === 'AVAILABLE', '25f. Table automatically released and marked AVAILABLE for next guest');

  console.log('\n===============================================================');
  console.log(` ALL 25 SCENARIOS COMPLETED: ${passedTests} / ${totalTests} TESTS PASSED!`);
  console.log('===============================================================\n');

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
