/**
 * Automated Verification Suite for Menu ↔ Recipe ↔ Inventory Availability Validation
 * Tests all 13 mandatory test cases specified in MASTER PROMPT.
 */

import { prisma } from './config/env.js';
import { evaluateMenuItemAvailability, validateOrderInventory } from './services/inventoryAvailability.service.js';
import * as orderService from './services/order.service.js';
import * as kitchenService from './services/kitchen.service.js';

let passed = 0;
let total = 0;

function assert(condition, message, details) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    if (details) console.error('   Details:', details);
    throw new Error(message);
  } else {
    passed++;
    console.log(`✅ PASSED: [Test ${total}] ${message}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log(' STARTING MENU ↔ RECIPE ↔ INVENTORY AVAILABILITY VALIDATION TESTS');
  console.log('===============================================================\n');

  // Step 0: Setup test restaurant and users
  let restaurant = await prisma.restaurant.findFirst({ where: { isActive: true } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: 'Test Restaurant', currency: 'INR', isActive: true },
    });
  }

  const restaurantId = restaurant.id;

  let waiter = await prisma.user.findFirst({
    where: { restaurantId, role: 'WAITER' },
  });
  if (!waiter) {
    waiter = await prisma.user.create({
      data: {
        restaurantId,
        name: 'Test Waiter',
        email: 'waiter.inventory.test@pos.com',
        password: 'hash',
        role: 'WAITER',
      },
    });
  }

  let table = await prisma.table.findFirst({ where: { restaurantId } });
  if (!table) {
    table = await prisma.table.create({
      data: { restaurantId, tableNumber: 'T-99', capacity: 4, status: 'AVAILABLE' },
    });
  }

  // Ensure test inventory items: Aata, Dal, Oil
  let aata = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: 'Test Aata' } });
  if (!aata) {
    aata = await prisma.inventoryItem.create({
      data: { restaurantId, name: 'Test Aata', currentStock: 10.0, unit: 'KG', minStockThreshold: 1 },
    });
  } else {
    await prisma.inventoryItem.update({ where: { id: aata.id }, data: { currentStock: 10.0 } });
  }

  let dal = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: 'Test Dal' } });
  if (!dal) {
    dal = await prisma.inventoryItem.create({
      data: { restaurantId, name: 'Test Dal', currentStock: 5.0, unit: 'KG', minStockThreshold: 1 },
    });
  } else {
    await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 5.0 } });
  }

  let oil = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: 'Test Oil' } });
  if (!oil) {
    oil = await prisma.inventoryItem.create({
      data: { restaurantId, name: 'Test Oil', currentStock: 5.0, unit: 'LITER', minStockThreshold: 1 },
    });
  } else {
    await prisma.inventoryItem.update({ where: { id: oil.id }, data: { currentStock: 5.0 } });
  }

  // Item 1: Dal Baffle Full Recipe (Aata 0.2 KG, Dal 0.1 KG, Oil 0.03 L)
  let dalBaffle = await prisma.menuItem.findFirst({ where: { restaurantId, name: 'Test Dal Baffle' } });
  if (!dalBaffle) {
    dalBaffle = await prisma.menuItem.create({
      data: { restaurantId, name: 'Test Dal Baffle', price: 180, isAvailable: true },
    });
  }

  // Setup recipe for Dal Baffle
  let dalBaffleRecipe = await prisma.recipe.findUnique({ where: { menuItemId: dalBaffle.id } });
  if (!dalBaffleRecipe) {
    dalBaffleRecipe = await prisma.recipe.create({
      data: {
        menuItemId: dalBaffle.id,
        prepTime: 15,
        ingredients: {
          create: [
            { inventoryItemId: aata.id, quantityRequired: 0.2, unit: 'KG' },
            { inventoryItemId: dal.id, quantityRequired: 0.1, unit: 'KG' },
            { inventoryItemId: oil.id, quantityRequired: 0.03, unit: 'LITER' },
          ],
        },
      },
    });
  }

  // Item 2: Dish with NO recipe configured
  let noRecipeDish = await prisma.menuItem.findFirst({ where: { restaurantId, name: 'Test Mystery Dish' } });
  if (!noRecipeDish) {
    noRecipeDish = await prisma.menuItem.create({
      data: { restaurantId, name: 'Test Mystery Dish', price: 120, isAvailable: true },
    });
  } else {
    // ensure no recipe
    await prisma.recipe.deleteMany({ where: { menuItemId: noRecipeDish.id } });
  }

  // Item 3: Dish with missing inventory item referenced
  let missingInvDish = await prisma.menuItem.findFirst({ where: { restaurantId, name: 'Test Ghost Item' } });
  if (!missingInvDish) {
    missingInvDish = await prisma.menuItem.create({
      data: { restaurantId, name: 'Test Ghost Item', price: 90, isAvailable: true },
    });
  }

  // -------------------------------------------------------------
  // TEST 1: Menu exists + recipe exists + sufficient stock -> ORDER ALLOWED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 1: Sufficient stock -> ORDER ALLOWED ---');
  await prisma.inventoryItem.update({ where: { id: aata.id }, data: { currentStock: 10.0 } });
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 5.0 } });
  await prisma.inventoryItem.update({ where: { id: oil.id }, data: { currentStock: 5.0 } });

  const dalBaffleLoaded = await prisma.menuItem.findUnique({
    where: { id: dalBaffle.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });

  const avail1 = evaluateMenuItemAvailability(dalBaffleLoaded, 1);
  assert(avail1.isOrderable === true, 'Test 1 frontend evaluation: Dal Baffle is orderable when stock sufficient', avail1);
  assert(avail1.maxOrderableQuantity >= 50, 'Test 1 frontend evaluation: maxOrderableQuantity calculated correctly', avail1.maxOrderableQuantity);

  await prisma.$transaction(async (tx) => {
    const valid = await validateOrderInventory(tx, restaurantId, [{ menuItemId: dalBaffle.id, quantity: 1 }]);
    assert(valid === true, 'Test 1 backend validation: Order with sufficient stock passes validation');
  });

  // -------------------------------------------------------------
  // TEST 2: Menu exists + no recipe -> ORDER BLOCKED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 2: No recipe configured -> ORDER BLOCKED ---');
  const noRecipeLoaded = await prisma.menuItem.findUnique({
    where: { id: noRecipeDish.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });

  const avail2 = evaluateMenuItemAvailability(noRecipeLoaded, 1);
  assert(avail2.isOrderable === false, 'Test 2 frontend evaluation: Dish with no recipe is NOT orderable', avail2);
  assert(avail2.reasonCode === 'NO_RECIPE', 'Test 2 frontend evaluation: reasonCode is NO_RECIPE', avail2.reasonCode);
  assert(avail2.reasonTitle === 'Inventory unavailable', 'Test 2 frontend evaluation: reasonTitle is "Inventory unavailable"');
  assert(avail2.reasonMessage.includes('Recipe ingredients are not configured'), 'Test 2 message matches requirement');

  let test2Blocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await validateOrderInventory(tx, restaurantId, [{ menuItemId: noRecipeDish.id, quantity: 1 }]);
    });
  } catch (err) {
    test2Blocked = true;
    assert(err.code === 'INSUFFICIENT_INVENTORY', 'Test 2 backend rejection code is INSUFFICIENT_INVENTORY', err);
    assert(err.message.includes('Recipe ingredients are not configured'), 'Test 2 backend rejection message is correct', err.message);
  }
  assert(test2Blocked, 'Test 2 backend validation BLOCKED order for dish without recipe');

  // -------------------------------------------------------------
  // TEST 3: Recipe exists + ingredient missing -> ORDER BLOCKED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 3: Ingredient missing from inventory -> ORDER BLOCKED ---');
  // Create dummy recipe referencing non-existent inventory item id
  const fakeItemId = '00000000-0000-0000-0000-000000000000';
  const ghostMenuItem = {
    id: missingInvDish.id,
    name: missingInvDish.name,
    isAvailable: true,
    recipe: {
      ingredients: [
        {
          name: 'Exotic Saffron',
          inventoryItemId: fakeItemId,
          quantityRequired: 0.01,
          unit: 'KG',
          inventoryItem: null,
        },
      ],
    },
  };
  const avail3 = evaluateMenuItemAvailability(ghostMenuItem, 1);
  assert(avail3.isOrderable === false, 'Test 3 frontend: Missing ingredient is NOT orderable');
  assert(avail3.reasonCode === 'MISSING_INGREDIENT', 'Test 3 reasonCode is MISSING_INGREDIENT');
  assert(avail3.reasonMessage.includes('not available in inventory'), 'Test 3 message identifies missing ingredient', avail3.reasonMessage);

  // -------------------------------------------------------------
  // TEST 4: Recipe exists + insufficient ingredient -> ORDER BLOCKED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 4: Insufficient ingredient stock -> ORDER BLOCKED ---');
  // Dal Baffle requires 0.10 KG Dal. Set Dal stock = 0.05 KG.
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 0.05 } });

  const dalBaffleLowDal = await prisma.menuItem.findUnique({
    where: { id: dalBaffle.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });

  const avail4 = evaluateMenuItemAvailability(dalBaffleLowDal, 1);
  assert(avail4.isOrderable === false, 'Test 4 frontend: Dal Baffle blocked when Dal stock is 0.05 KG vs 0.10 KG required');
  assert(avail4.reasonCode === 'INSUFFICIENT_STOCK', 'Test 4 reasonCode is INSUFFICIENT_STOCK');
  assert(avail4.reasonTitle === 'Insufficient Inventory', 'Test 4 reasonTitle is "Insufficient Inventory"');
  assert(avail4.reasonMessage.includes('Test Dal requires 0.10 KG, but only 0.05 KG is available'), 'Test 4 message shows required vs available', avail4.reasonMessage);

  let test4Blocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await validateOrderInventory(tx, restaurantId, [{ menuItemId: dalBaffle.id, quantity: 1 }]);
    });
  } catch (err) {
    test4Blocked = true;
    assert(err.code === 'INSUFFICIENT_INVENTORY', 'Test 4 backend rejection code is INSUFFICIENT_INVENTORY');
    assert(Array.isArray(err.items) && err.items.length === 1, 'Test 4 structured items array returned');
    assert(err.items[0].ingredient === 'Test Dal', 'Test 4 identified failing ingredient as Test Dal');
    assert(err.items[0].required === 0.1 && err.items[0].available === 0.05, 'Test 4 item details match required 0.1 vs available 0.05');
  }
  assert(test4Blocked, 'Test 4 backend BLOCKED order due to insufficient ingredient');

  // -------------------------------------------------------------
  // TEST 5: Multiple ingredients + one insufficient -> ORDER BLOCKED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 5: Multiple ingredients, one fails -> ORDER BLOCKED ---');
  // Aata = 10 KG (PASS), Oil = 5 L (PASS), Dal = 0.05 KG (FAIL)
  await prisma.inventoryItem.update({ where: { id: aata.id }, data: { currentStock: 10.0 } });
  await prisma.inventoryItem.update({ where: { id: oil.id }, data: { currentStock: 5.0 } });
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 0.05 } });

  const dalBaffleMultiCheck = await prisma.menuItem.findUnique({
    where: { id: dalBaffle.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });
  const avail5 = evaluateMenuItemAvailability(dalBaffleMultiCheck, 1);
  assert(avail5.isOrderable === false, 'Test 5: Multiple ingredients check blocks dish when only one fails');
  assert(avail5.missingIngredients.length === 1 && avail5.missingIngredients[0].ingredient === 'Test Dal', 'Test 5 specifically isolated Dal as missing');

  // -------------------------------------------------------------
  // TEST 6: Quantity 1 available -> ORDER ALLOWED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 6: Stock allows quantity 1 -> ORDER ALLOWED ---');
  // Dal = 0.15 KG (enough for 1 dish of 0.10 KG, but not for 2 dishes)
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 0.15 } });

  const dalBaffleSingleQty = await prisma.menuItem.findUnique({
    where: { id: dalBaffle.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });
  const avail6 = evaluateMenuItemAvailability(dalBaffleSingleQty, 1);
  assert(avail6.isOrderable === true, 'Test 6: Quantity 1 is ALLOWED when stock is 0.15 KG');
  assert(avail6.maxOrderableQuantity === 1, 'Test 6: Max orderable quantity is exactly 1 portion');

  // -------------------------------------------------------------
  // TEST 7: Quantity greater than available capacity -> ORDER BLOCKED
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 7: Multi-quantity greater than stock -> ORDER BLOCKED ---');
  // Waiter attempts quantity = 5. Required = 0.50 KG. Available = 0.40 KG.
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 0.40 } });

  const dalBaffle5Units = await prisma.menuItem.findUnique({
    where: { id: dalBaffle.id },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
  });
  const avail7 = evaluateMenuItemAvailability(dalBaffle5Units, 5);
  assert(avail7.isOrderable === false, 'Test 7 frontend: 5 units blocked when required is 0.50 KG and available is 0.40 KG');
  assert(avail7.reasonMessage.includes('Insufficient Inventory for 5 units'), 'Test 7 message specifies "Insufficient Inventory for 5 units"');
  assert(avail7.reasonMessage.includes('required: 0.50 KG') && avail7.reasonMessage.includes('Available: 0.40 KG'), 'Test 7 message has required 0.50 KG and Available 0.40 KG');

  let test7Blocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await validateOrderInventory(tx, restaurantId, [{ menuItemId: dalBaffle.id, quantity: 5 }]);
    });
  } catch (err) {
    test7Blocked = true;
    assert(err.code === 'INSUFFICIENT_INVENTORY', 'Test 7 backend blocked multi-quantity order with INSUFFICIENT_INVENTORY');
    assert(err.items[0].required === 0.5 && err.items[0].available === 0.4, 'Test 7 backend structured item details match required 0.5 vs available 0.4');
  }
  assert(test7Blocked, 'Test 7 backend successfully blocked multi-quantity overflow');

  // -------------------------------------------------------------
  // TEST 8: Race condition / Stock becomes insufficient after selection
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 8: Stock drops before submission -> BACKEND BLOCKS ---');
  // Waiter A selected 2 Dal Baffles when Dal was 1 KG.
  // Then stock drops to 0.10 KG. (2 Dal Baffles require 0.20 KG)
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 0.10 } });

  let test8Blocked = false;
  try {
    await prisma.$transaction(async (tx) => {
      await validateOrderInventory(tx, restaurantId, [{ menuItemId: dalBaffle.id, quantity: 2 }]);
    });
  } catch (err) {
    test8Blocked = true;
    assert(err.code === 'INSUFFICIENT_INVENTORY', 'Test 8 race condition caught: backend rejected submission with INSUFFICIENT_INVENTORY');
  }
  assert(test8Blocked, 'Test 8 backend prevented overselling concurrent inventory');

  // -------------------------------------------------------------
  // TEST 9: Stock is sufficient -> Existing order flow works normally
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 9: Stock sufficient -> ORDER PLACED SUCCESSFULLY ---');
  await prisma.inventoryItem.update({ where: { id: dal.id }, data: { currentStock: 5.0 } });
  await prisma.inventoryItem.update({ where: { id: aata.id }, data: { currentStock: 10.0 } });
  await prisma.inventoryItem.update({ where: { id: oil.id }, data: { currentStock: 5.0 } });

  // Reset table status to AVAILABLE
  await prisma.table.update({ where: { id: table.id }, data: { status: 'AVAILABLE' } });
  // Clean any active order on this table for clean test
  await prisma.order.deleteMany({ where: { tableId: table.id, restaurantId } });

  const orderCreated = await orderService.createOrder(restaurantId, waiter.id, {
    tableId: table.id,
    items: [{ menuItemId: dalBaffle.id, quantity: 2 }],
  });
  assert(orderCreated && orderCreated.id, 'Test 9: Order created successfully with sufficient stock');
  assert(orderCreated.items.length === 1 && orderCreated.items[0].quantity === 2, 'Test 9: Order items persisted accurately');

  // -------------------------------------------------------------
  // TEST 10: Existing already-ordered/served items remain unaffected
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 10: Existing orders remain unaffected ---');
  const existingOrder = await orderService.getOrderById(restaurantId, orderCreated.id);
  assert(existingOrder.id === orderCreated.id, 'Test 10: Existing order retrieved without disruption');
  assert(existingOrder.items[0].status === 'PENDING', 'Test 10: Existing item status remains PENDING');

  // -------------------------------------------------------------
  // TEST 11: No duplicate order created when adding items to table
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 11: Table append creates no duplicate order ---');
  const appendedOrder = await orderService.createOrder(restaurantId, waiter.id, {
    tableId: table.id,
    items: [{ menuItemId: dalBaffle.id, quantity: 1 }],
  });
  assert(appendedOrder.id === orderCreated.id, 'Test 11: Items merged into existing active order, NO duplicate created');
  assert(appendedOrder.items[0].quantity === 3, 'Test 11: Item quantity merged from 2 to 3');

  // -------------------------------------------------------------
  // TEST 12: No inventory deducted during item selection / ordering
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 12: No inventory deducted at order time ---');
  const dalStockAfterOrder = await prisma.inventoryItem.findUnique({ where: { id: dal.id } });
  assert(Number(dalStockAfterOrder.currentStock) === 5.0, 'Test 12: Dal inventory remains 5.0 KG (NO deduction on order placement)');

  // -------------------------------------------------------------
  // TEST 13: Existing kitchen inventory deduction still works normally
  // -------------------------------------------------------------
  console.log('\n--- Running TEST 13: Kitchen ready transitions deduct stock normally ---');
  await kitchenService.startPreparation(restaurantId, orderCreated.id);
  const readyOrder = await kitchenService.markOrderReady(restaurantId, orderCreated.id);
  assert(readyOrder.status === 'READY', 'Test 13: Kitchen marked order as READY');

  const dalStockAfterKitchen = await prisma.inventoryItem.findUnique({ where: { id: dal.id } });
  // Order had 3x Dal Baffle. 3 * 0.1 KG = 0.3 KG deducted. 5.0 - 0.3 = 4.7 KG.
  assert(Number(dalStockAfterKitchen.currentStock) === 4.7, 'Test 13: Dal inventory correctly deducted from 5.0 KG to 4.7 KG upon kitchen READY', dalStockAfterKitchen.currentStock);

  console.log('\n===============================================================');
  console.log(` ALL 13 TEST CASES PASSED SUCCESSFULLY (${passed}/${total})`);
  console.log('===============================================================\n');

  // Clean up test order
  await prisma.order.deleteMany({ where: { id: orderCreated.id } });
  await prisma.table.update({ where: { id: table.id }, data: { status: 'AVAILABLE' } });
}

runTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Test execution failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
