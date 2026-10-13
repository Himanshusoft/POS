import http from 'http';
import bcrypt from 'bcryptjs';
import app from '../backend/src/app.js';
import { prisma } from '../backend/src/config/env.js';

let server;
let baseUrl;
let passed = 0;
let total = 0;

function assert(condition, label, details = null) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${label}`);
    if (details) console.error('   Details:', JSON.stringify(details, null, 2));
    throw new Error(`Assertion failed: ${label}`);
  }
  passed++;
  console.log(`✅ PASS: ${label}`);
}

async function api(endpoint, options = {}) {
  const res = await fetch(`${baseUrl}/api${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('==============================================================');
  console.log(' RESTAURANT POS — BILLING ELIGIBILITY & ORDER WORKFLOW TESTS');
  console.log('==============================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;

  const passwordHash = await bcrypt.hash('Password123', 10);

  // Setup Restaurant A & Restaurant B
  let restA = await prisma.restaurant.findFirst({ where: { isActive: true } });
  if (!restA) {
    restA = await prisma.restaurant.create({
      data: { name: 'Restaurant A', currency: 'INR', taxRate: 5.0, isActive: true },
    });
  }

  let restB = await prisma.restaurant.findFirst({ where: { name: 'Restaurant B Tenant Test' } });
  if (!restB) {
    restB = await prisma.restaurant.create({
      data: { name: 'Restaurant B Tenant Test', currency: 'INR', taxRate: 5.0, isActive: true },
    });
  }

  const upsertUser = async (email, name, role, restaurantId) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return await prisma.user.update({
        where: { id: existing.id },
        data: { name, role, restaurantId, password: passwordHash, isActive: true },
      });
    }
    return await prisma.user.create({
      data: { email, name, role, restaurantId, password: passwordHash, isActive: true },
    });
  };

  await upsertUser('waiter.flow@pos.com', 'Waiter A', 'WAITER', restA.id);
  await upsertUser('kitchen.flow@pos.com', 'Kitchen A', 'KITCHEN_ADMIN', restA.id);
  await upsertUser('recep.flow@pos.com', 'Receptionist A', 'RECEPTIONIST', restA.id);
  await upsertUser('recep.b.flow@pos.com', 'Receptionist B', 'RECEPTIONIST', restB.id);

  // Login tokens
  const login = async (email) => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email, password: 'Password123' },
    });
    assert(res.status === 200 && res.data?.data?.token, `Login succeeds for ${email}`);
    return res.data.data.token;
  };

  const waiterToken = await login('waiter.flow@pos.com');
  const kitchenToken = await login('kitchen.flow@pos.com');
  const recepToken = await login('recep.flow@pos.com');
  const recepBToken = await login('recep.b.flow@pos.com');

  // Ensure inventory + menu item + recipe exist in Restaurant A
  let invFlour = await prisma.inventoryItem.findFirst({
    where: { restaurantId: restA.id, name: 'Test Flour Flow' },
  });
  if (!invFlour) {
    invFlour = await prisma.inventoryItem.create({
      data: {
        restaurantId: restA.id,
        name: 'Test Flour Flow',
        currentStock: 100.0,
        minStockThreshold: 5.0,
        unit: 'KG',
      },
    });
  } else {
    await prisma.inventoryItem.update({
      where: { id: invFlour.id },
      data: { currentStock: 100.0 },
    });
  }

  let dish1 = await prisma.menuItem.findFirst({
    where: { restaurantId: restA.id, name: 'Butter Naan Flow' },
  });
  if (!dish1) {
    dish1 = await prisma.menuItem.create({
      data: {
        restaurantId: restA.id,
        name: 'Butter Naan Flow',
        price: 100.0,
        isAvailable: true,
      },
    });
  }
  await prisma.recipe.upsert({
    where: { menuItemId: dish1.id },
    update: {},
    create: {
      menuItemId: dish1.id,
      prepTime: 10,
      ingredients: {
        create: [{ inventoryItemId: invFlour.id, quantityRequired: 100, unit: 'GRAM' }],
      },
    },
  });

  let dish2 = await prisma.menuItem.findFirst({
    where: { restaurantId: restA.id, name: 'Paneer Tikka Flow' },
  });
  if (!dish2) {
    dish2 = await prisma.menuItem.create({
      data: {
        restaurantId: restA.id,
        name: 'Paneer Tikka Flow',
        price: 250.0,
        isAvailable: true,
      },
    });
  }
  await prisma.recipe.upsert({
    where: { menuItemId: dish2.id },
    update: {},
    create: {
      menuItemId: dish2.id,
      prepTime: 15,
      ingredients: {
        create: [{ inventoryItemId: invFlour.id, quantityRequired: 150, unit: 'GRAM' }],
      },
    },
  });

  // Create clean test table
  const tableNum = `T-FLOW-${Date.now().toString().slice(-4)}`;
  const table = await prisma.table.create({
    data: {
      restaurantId: restA.id,
      tableNumber: tableNum,
      capacity: 4,
      status: 'AVAILABLE',
    },
  });

  // ---------------------------------------------------------------------------
  // ROLE PERMISSION CHECK: Receptionist cannot create waiter orders
  // ---------------------------------------------------------------------------
  console.log('\n--- RBAC: Receptionist Cannot Create Waiter Orders ---');
  const recepCreateOrder = await api('/orders', {
    method: 'POST',
    token: recepToken,
    body: { tableId: table.id, items: [{ menuItemId: dish1.id, quantity: 1 }] },
  });
  assert(recepCreateOrder.status === 403, 'Receptionist cannot create waiter orders (403)', recepCreateOrder);

  // ---------------------------------------------------------------------------
  // STEP 1: Waiter Creates Order (Status = PENDING / NEW)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST B / Scenario 1: Early Billing on NEW (PENDING) Order ---');
  const createOrderRes = await api('/orders', {
    method: 'POST',
    token: waiterToken,
    body: {
      tableId: table.id,
      items: [{ menuItemId: dish1.id, quantity: 2 }],
    },
  });
  assert(createOrderRes.status === 201, 'Waiter creates order (201 Created)', createOrderRes);
  const order = createOrderRes.data.data;
  assert(order.status === 'PENDING', 'Order starts in PENDING status');

  // Waiter tries to generate bill on NEW order -> 403
  const waiterBillNew = await api('/billing/generate', {
    method: 'POST',
    token: waiterToken,
    body: { orderId: order.id },
  });
  assert(waiterBillNew.status === 403, 'Waiter attempting to generate bill on NEW order is rejected with 403', waiterBillNew);

  // Waiter tries to request bill on NEW order -> 400
  const waiterReqBillNew = await api(`/orders/${order.id}/request-bill`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(waiterReqBillNew.status === 400, 'Waiter attempting to request bill on NEW order is rejected with 400', waiterReqBillNew);

  // Receptionist tries to generate bill on NEW order (even spoofing status: "SERVED" in body) -> 400
  const recepBillNew = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id, status: 'SERVED' },
  });
  assert(
    recepBillNew.status === 400 && recepBillNew.data?.message?.includes('Order is not eligible for billing'),
    'Receptionist attempting to generate bill on NEW order (even with spoofed status="SERVED") is rejected with 400',
    recepBillNew
  );

  // Pending Billing list must NOT contain NEW order
  const pendingListNew = await api('/billing/pending-orders', { token: recepToken });
  const inPendingNew = (pendingListNew.data?.data || []).some((o) => o.id === order.id);
  assert(!inPendingNew, 'Receptionist Pending Billing does NOT include NEW order');

  // ---------------------------------------------------------------------------
  // STEP 2: Waiter Sends Order to Kitchen -> Kitchen Accepts & Starts Preparing
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST C / Scenario 2: Billing During ACCEPTED & PREPARING ---');
  const sendKitchenRes = await api(`/orders/${order.id}/send-to-kitchen`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(sendKitchenRes.status === 200, 'Waiter sends order to kitchen (200 OK)', sendKitchenRes);

  const acceptRes = await api(`/kitchen/orders/${order.id}/accept`, {
    method: 'PATCH',
    token: kitchenToken,
  });
  assert(acceptRes.status === 200 && acceptRes.data.data.status === 'ACCEPTED', 'Kitchen Admin accepts order (ACCEPTED)', acceptRes);

  // Try billing on ACCEPTED -> 400
  const recepBillAccepted = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id },
  });
  assert(recepBillAccepted.status === 400, 'Receptionist billing on ACCEPTED order is rejected with 400', recepBillAccepted);

  // Kitchen starts PREPARING
  const prepRes = await api(`/kitchen/orders/${order.id}/prepare`, {
    method: 'PATCH',
    token: kitchenToken,
  });
  assert(prepRes.status === 200 && prepRes.data.data.status === 'IN_PREPARATION', 'Kitchen Admin marks order IN_PREPARATION', prepRes);

  // Try billing on PREPARING -> 400
  const recepBillPrep = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id, status: 'SERVED' },
  });
  assert(
    recepBillPrep.status === 400 && recepBillPrep.data?.message?.includes('Order is not eligible for billing'),
    'Receptionist billing on PREPARING order is rejected with 400',
    recepBillPrep
  );

  // Waiter cannot mark PREPARING order as SERVED directly -> 409
  const earlyServeRes = await api(`/orders/${order.id}/serve`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(earlyServeRes.status === 409, 'Waiter cannot mark PREPARING order as SERVED before READY (409)', earlyServeRes);

  // ---------------------------------------------------------------------------
  // STEP 3: Kitchen Marks Order READY
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST D / Scenario 3: Billing When Order is READY (Before Served) ---');
  const readyRes = await api(`/kitchen/orders/${order.id}/ready`, {
    method: 'PATCH',
    token: kitchenToken,
  });
  assert(readyRes.status === 200 && readyRes.data.data.status === 'READY', 'Kitchen Admin marks order READY', readyRes);

  // Receptionist tries to generate bill when READY (before customer is served) -> MUST FAIL
  const recepBillReady = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id },
  });
  assert(
    recepBillReady.status === 400 && recepBillReady.data?.message?.includes('Order is not eligible for billing'),
    'Receptionist billing on READY order (before SERVED) is rejected with 400',
    recepBillReady
  );

  // Waiter tries to request bill when READY -> MUST FAIL
  const waiterReqBillReady = await api(`/orders/${order.id}/request-bill`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(waiterReqBillReady.status === 400, 'Waiter requesting bill on READY order (before SERVED) is rejected with 400', waiterReqBillReady);

  // Pending Billing list must still NOT contain READY order
  const pendingListReady = await api('/billing/pending-orders', { token: recepToken });
  const inPendingReady = (pendingListReady.data?.data || []).some((o) => o.id === order.id);
  assert(!inPendingReady, 'Receptionist Pending Billing does NOT include READY order');

  // ---------------------------------------------------------------------------
  // STEP 4: Waiter Serves Customer -> Order becomes SERVED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST A, E, F, G, H: Order SERVED -> Billing & Role / Tenant / Duplicate Checks ---');
  const serveRes = await api(`/orders/${order.id}/serve`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(serveRes.status === 200 && serveRes.data.data.status === 'SERVED', 'Waiter marks order as SERVED', serveRes);

  // Multi-item test: What if Waiter adds an additional item AFTER first batch was SERVED?
  console.log('\n--- SECTION 15: Multi-Item Order Support (Appending Items Resets Billing Eligibility) ---');
  const addMoreRes = await api(`/orders/${order.id}/items`, {
    method: 'POST',
    token: waiterToken,
    body: { items: [{ menuItemId: dish2.id, quantity: 1 }] },
  });
  assert(
    addMoreRes.status === 200 && addMoreRes.data.data.status === 'IN_PREPARATION',
    'Appending new item transitions order back to IN_PREPARATION',
    addMoreRes
  );

  // Try generating bill while new item is still IN_PREPARATION -> MUST FAIL
  const billWhileExtraItemCooking = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id },
  });
  assert(
    billWhileExtraItemCooking.status === 400,
    'Cannot generate bill when newly appended item has not been prepared and served',
    billWhileExtraItemCooking
  );

  // Kitchen prepares and marks READY for the appended item
  await api(`/kitchen/orders/${order.id}/prepare`, { method: 'PATCH', token: kitchenToken });
  const readyAgainRes = await api(`/kitchen/orders/${order.id}/ready`, { method: 'PATCH', token: kitchenToken });
  assert(readyAgainRes.status === 200 && readyAgainRes.data.data.status === 'READY', 'Kitchen marks order READY after preparing appended item', readyAgainRes);

  // Waiter serves the second batch -> Order is SERVED again
  const serveAgainRes = await api(`/orders/${order.id}/serve`, { method: 'POST', token: waiterToken });
  assert(serveAgainRes.status === 200 && serveAgainRes.data.data.status === 'SERVED', 'Waiter marks order SERVED after serving all items', serveAgainRes);

  // TEST F / Scenario 5: Waiter attempts to generate bill when order is SERVED -> 403
  const waiterBillServed = await api('/billing/generate', {
    method: 'POST',
    token: waiterToken,
    body: { orderId: order.id },
  });
  assert(
    waiterBillServed.status === 403 && waiterBillServed.data?.message === 'You are not authorized to generate bills.',
    'TEST F / Scenario 5: Waiter attempting to generate bill on SERVED order is rejected with 403 ("You are not authorized to generate bills.")',
    waiterBillServed
  );

  // Kitchen Admin attempts to generate bill when order is SERVED -> 403
  const kitchenBillServed = await api('/billing/generate', {
    method: 'POST',
    token: kitchenToken,
    body: { orderId: order.id },
  });
  assert(
    kitchenBillServed.status === 403 && kitchenBillServed.data?.message === 'You are not authorized to generate bills.',
    'Kitchen Admin attempting to generate bill is rejected with 403',
    kitchenBillServed
  );

  // TEST H / Scenario 7: Restaurant B Receptionist attempts to generate bill for Restaurant A order -> 404
  const tenantBreachBill = await api('/billing/generate', {
    method: 'POST',
    token: recepBToken,
    body: { orderId: order.id },
  });
  assert(
    tenantBreachBill.status === 404 || tenantBreachBill.status === 403,
    'TEST H / Scenario 7: Restaurant B Receptionist cannot generate bill for Restaurant A order (404/403)',
    tenantBreachBill
  );

  // Verify Receptionist A now sees the SERVED order in Pending Billing
  const pendingListServed = await api('/billing/pending-orders', { token: recepToken });
  const inPendingServed = (pendingListServed.data?.data || []).some((o) => o.id === order.id);
  assert(inPendingServed, 'Receptionist Pending Billing includes SERVED order without bill');

  // TEST E / Scenario 4: Receptionist A generates bill for SERVED order -> MUST SUCCEED
  const genBillRes = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id },
  });
  assert(genBillRes.status === 201, 'TEST E / Scenario 4: Receptionist generates bill for SERVED order (201 Created)', genBillRes);
  const bill = genBillRes.data.data;
  assert(bill.status === 'UNPAID', 'Generated bill status is UNPAID (Ready for Payment)');
  // Verify server-side subtotal calculation: 2 * 100 + 1 * 250 = 450, + 5% tax (22.5) = 472.5
  assert(Number(bill.subtotal) === 450, `Server-side subtotal calculated accurately (450 === ${bill.subtotal})`);
  assert(Number(bill.totalAmount) === 472.5, `Server-side totalAmount calculated accurately (472.5 === ${bill.totalAmount})`);

  // Verify order is still SERVED (NOT marked COMPLETED merely because bill was generated)
  const orderAfterBill = await prisma.order.findUnique({ where: { id: order.id } });
  assert(orderAfterBill.status === 'SERVED', 'Order remains SERVED (not COMPLETED) when bill is generated');

  // TEST G / Scenario 6: Generate bill twice -> Second request fails with 409, no duplicate bill
  const dupBillRes = await api('/billing/generate', {
    method: 'POST',
    token: recepToken,
    body: { orderId: order.id },
  });
  assert(dupBillRes.status === 409, 'TEST G / Scenario 6: Second bill generation request rejected with 409 Conflict', dupBillRes);
  const billsCountForOrder = await prisma.bill.count({ where: { orderId: order.id } });
  assert(billsCountForOrder === 1, 'Exactly 1 bill exists in database for the order');

  // Waiter can view and deliver bill after Receptionist generates it
  const deliverBillRes = await api(`/billing/bills/${bill.id}/deliver`, {
    method: 'POST',
    token: waiterToken,
  });
  assert(deliverBillRes.status === 200 && deliverBillRes.data.data.isDelivered === true, 'Waiter delivers generated bill to customer', deliverBillRes);

  // Waiter cannot collect payment -> 403
  const waiterPayAttempt = await api('/payments', {
    method: 'POST',
    token: waiterToken,
    body: { billId: bill.id, amount: Number(bill.totalAmount), method: 'CASH' },
  });
  assert(waiterPayAttempt.status === 403, 'Waiter cannot collect or confirm payment (403)', waiterPayAttempt);

  // Receptionist collects payment -> Bill = PAID, Payment = COMPLETED, Order = COMPLETED, Table = AVAILABLE
  const recepPayRes = await api('/payments', {
    method: 'POST',
    token: recepToken,
    body: { billId: bill.id, amount: Number(bill.totalAmount), method: 'UPI' },
  });
  assert(recepPayRes.status === 201, 'Receptionist processes UPI payment (201 Created)', recepPayRes);
  assert(recepPayRes.data.data.bill.status === 'PAID', 'Bill status updated to PAID');
  assert(recepPayRes.data.data.payment.status === 'COMPLETED', 'Payment status is COMPLETED');

  const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
  const finalTable = await prisma.table.findUnique({ where: { id: table.id } });
  assert(finalOrder.status === 'COMPLETED', 'Order status transitioned to COMPLETED after payment');
  assert(finalTable.status === 'AVAILABLE', 'Table released to AVAILABLE after payment');

  // Clean up test data
  await prisma.payment.deleteMany({ where: { billId: bill.id } });
  await prisma.bill.delete({ where: { id: bill.id } });
  await prisma.inventoryTransaction.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.table.delete({ where: { id: table.id } });

  console.log('\n==============================================================');
  console.log(` ALL ${passed}/${total} BILLING & WORKFLOW TESTS PASSED!`);
  console.log('==============================================================\n');
}

run()
  .then(async () => {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(1);
  });
