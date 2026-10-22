import { prisma } from '../config/env.js';
import { serializableTransaction } from '../utils/transaction.js';
import { findManyPaginated } from '../utils/pagination.js';
import { convertQuantity } from '../utils/unitConversion.js';
import {
  cachedQuery,
  buildCacheKey,
  invalidateOrderCache,
  invalidateInventoryCache,
  invalidateTableCache,
} from '../utils/cache.js';
import { getRestaurantInventoryPolicy, getEffectiveThreshold } from './setting.service.js';

/**
 * Returns analytical and operational dashboard metrics for Kitchen Admin.
 * All metrics are live and derived from the Neon PostgreSQL database.
 */
export const getKitchenDashboard = async (restaurantId) => {
  const cacheKey = buildCacheKey(restaurantId, 'kitchen', { type: 'dashboard' });
  return await cachedQuery(cacheKey, 8, async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

  const [
    newOrdersCount,
    preparingOrdersCount,
    readyOrdersCount,
    completedTodayCount,
    allInventoryItems,
    completedTodayWithPrepTime,
    activeOrders,
    recentTransactions,
    inventoryPolicy,
  ] = await Promise.all([
    prisma.order.count({
      where: { restaurantId, status: 'PENDING' },
    }),
    prisma.order.count({
      where: { restaurantId, status: { in: ['ACCEPTED', 'IN_PREPARATION'] } },
    }),
    prisma.order.count({
      where: { restaurantId, status: 'READY' },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['SERVED', 'COMPLETED'] },
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStockThreshold: true,
        unit: true,
      },
      orderBy: { currentStock: 'asc' },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['READY', 'SERVED', 'COMPLETED'] },
        readyAt: { not: null },
        createdAt: { gte: startOfDay },
      },
      select: {
        createdAt: true,
        readyAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'ACCEPTED', 'IN_PREPARATION', 'READY'] },
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    ingredients: { include: { inventoryItem: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.inventoryTransaction.findMany({
      where: { restaurantId, type: 'CONSUMPTION' },
      include: {
        inventoryItem: { select: { name: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    getRestaurantInventoryPolicy(restaurantId),
  ]);

  const defaultThreshold = Number(inventoryPolicy?.lowStockThresholdDefault) || 5;
  const lowStockItems = allInventoryItems.filter(
    (i) => Number(i.currentStock) <= getEffectiveThreshold(i, defaultThreshold) && Number(i.currentStock) > 0
  );
  const outOfStockItems = allInventoryItems.filter((i) => Number(i.currentStock) <= 0);

  let avgPrepTimeMinutes = 0;
  if (completedTodayWithPrepTime.length > 0) {
    const totalMinutes = completedTodayWithPrepTime.reduce((sum, o) => {
      const diffMs = new Date(o.readyAt).getTime() - new Date(o.createdAt).getTime();
      return sum + Math.max(0, diffMs / 60000);
    }, 0);
    avgPrepTimeMinutes = Math.round(totalMinutes / completedTodayWithPrepTime.length);
  } else {
    const prepTimes = activeOrders.flatMap((o) =>
      o.items.map((i) => i.menuItem?.recipe?.prepTime).filter(Boolean)
    );
    if (prepTimes.length > 0) {
      avgPrepTimeMinutes = Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length);
    }
  }

  const tableOrders = activeOrders.map((order) => {
    const ingredientMap = new Map();
    let hasMissingRecipe = false;

    for (const item of order.items) {
      const recipe = item.menuItem?.recipe;
      if (!recipe || !recipe.ingredients?.length) {
        hasMissingRecipe = true;
      } else {
        for (const ing of recipe.ingredients) {
          const inv = ing.inventoryItem;
          if (!inv) continue;
          let needed = 0;
          try {
            const rawNeeded = Number(ing.quantityRequired) * item.quantity;
            needed = convertQuantity(rawNeeded, ing.unit, inv.unit);
          } catch {
            needed = Number(ing.quantityRequired) * item.quantity;
          }
          const cur = ingredientMap.get(inv.id) || {
            id: inv.id,
            name: inv.name,
            unit: inv.unit,
            currentStock: Number(inv.currentStock),
            requiredQuantity: 0,
          };
          cur.requiredQuantity = Number((cur.requiredQuantity + needed).toFixed(4));
          cur.isSufficient = cur.currentStock >= cur.requiredQuantity;
          ingredientMap.set(inv.id, cur);
        }
      }
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber: order.table?.tableNumber || 'N/A',
      tableId: order.tableId,
      waiter: order.waiter?.name || 'Staff',
      notes: order.notes,
      createdAt: order.createdAt,
      readyAt: order.readyAt,
      inventoryDeducted: order.inventoryDeducted,
      elapsedMinutes: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
      items: order.items.map((it) => ({
        id: it.id,
        name: it.menuItem?.name || 'Dish',
        quantity: it.quantity,
        notes: it.notes,
        prepTime: it.menuItem?.recipe?.prepTime || null,
        hasRecipe: Boolean(it.menuItem?.recipe?.ingredients?.length),
      })),
      calculatedIngredients: Array.from(ingredientMap.values()),
      hasMissingRecipe,
    };
  });

    return {
      kpis: {
        newOrders: newOrdersCount,
        preparingOrders: preparingOrdersCount,
        readyOrders: readyOrdersCount,
        completedOrders: completedTodayCount,
        lowStockIngredients: lowStockItems.length,
        outOfStockIngredients: outOfStockItems.length,
        averagePrepTimeMinutes: avgPrepTimeMinutes,
      },
      tableOrders,
      lowStockList: lowStockItems.slice(0, 5),
      outOfStockList: outOfStockItems.slice(0, 5),
      recentActivity: recentTransactions,
    };
  });
};

/**
 * Returns kitchen orders with pagination and filtering.
 */
export const getKitchenOrders = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'kitchen', { type: 'orders', ...filters });
  return await cachedQuery(cacheKey, 8, async () => {
    const where = { restaurantId };

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status;
  } else if (!filters.status) {
    where.status = { in: ['PENDING', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'SERVED'] };
  }

  if (filters.tableId) {
    where.tableId = filters.tableId;
  }

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: String(filters.search), mode: 'insensitive' } },
      { customerName: { contains: String(filters.search), mode: 'insensitive' } },
    ];
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const result = await findManyPaginated(
    prisma.order,
    {
      where,
      include: {
        table: true,
        waiter: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    ingredients: { include: { inventoryItem: true } },
                  },
                },
              },
            },
          },
        },
        inventoryTransactions: {
          include: { inventoryItem: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
    filters
  );

  result.items = result.items.map((order) => {
    const ingredientMap = new Map();
    let hasMissingRecipe = false;

    for (const orderItem of order.items) {
      const recipe = orderItem.menuItem?.recipe;
      if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        hasMissingRecipe = true;
      } else {
        for (const ing of recipe.ingredients) {
          const inv = ing.inventoryItem;
          if (!inv) continue;
          let needed = 0;
          try {
            const rawNeeded = Number(ing.quantityRequired) * orderItem.quantity;
            needed = convertQuantity(rawNeeded, ing.unit, inv.unit);
          } catch {
            needed = Number(ing.quantityRequired) * orderItem.quantity;
          }
          const current = ingredientMap.get(inv.id) || {
            inventoryItemId: inv.id,
            name: inv.name,
            unit: inv.unit,
            currentStock: Number(inv.currentStock),
            requiredQuantity: 0,
          };
          current.requiredQuantity = Number((current.requiredQuantity + needed).toFixed(4));
          current.isSufficient = current.currentStock >= current.requiredQuantity;
          ingredientMap.set(inv.id, current);
        }
      }
    }

    return {
      ...order,
      elapsedMinutes: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
      hasMissingRecipe,
      calculatedIngredients: Array.from(ingredientMap.values()),
    };
  });

    return result;
  });
};

/**
 * Returns single detailed kitchen order.
 */
export const getKitchenOrderById = async (restaurantId, orderId) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      table: true,
      waiter: { select: { id: true, name: true, role: true } },
      items: {
        include: {
          menuItem: {
            include: {
              recipe: {
                include: {
                  ingredients: { include: { inventoryItem: true } },
                },
              },
            },
          },
        },
      },
      inventoryTransactions: {
        include: { inventoryItem: { select: { name: true, unit: true } } },
      },
    },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const ingredientMap = new Map();
  let hasMissingRecipe = false;

  for (const orderItem of order.items) {
    const recipe = orderItem.menuItem?.recipe;
    if (!recipe || !recipe.ingredients?.length) {
      hasMissingRecipe = true;
    } else {
      for (const ing of recipe.ingredients) {
        const inv = ing.inventoryItem;
        if (!inv) continue;
        let needed = 0;
        try {
          const rawNeeded = Number(ing.quantityRequired) * orderItem.quantity;
          needed = convertQuantity(rawNeeded, ing.unit, inv.unit);
        } catch {
          needed = Number(ing.quantityRequired) * orderItem.quantity;
        }
        const current = ingredientMap.get(inv.id) || {
          inventoryItemId: inv.id,
          name: inv.name,
          unit: inv.unit,
          currentStock: Number(inv.currentStock),
          requiredQuantity: 0,
        };
        current.requiredQuantity = Number((current.requiredQuantity + needed).toFixed(4));
        current.isSufficient = current.currentStock >= current.requiredQuantity;
        ingredientMap.set(inv.id, current);
      }
    }
  }

  return {
    ...order,
    elapsedMinutes: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
    hasMissingRecipe,
    calculatedIngredients: Array.from(ingredientMap.values()),
  };
};

export const getPendingOrders = async (restaurantId, filters = {}) => {
  return await getKitchenOrders(restaurantId, { ...filters, status: 'PENDING' });
};

/**
 * Transitions order: PENDING -> ACCEPTED
 */
export const acceptOrder = async (restaurantId, orderId) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (!['PENDING', 'ACCEPTED'].includes(order.status)) {
      const error = new Error(`Order cannot be accepted from status '${order.status}'. Must be 'PENDING' or 'ACCEPTED'.`);
      error.statusCode = 409;
      throw error;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'ACCEPTED' },
    });
    return await tx.order.findUnique({
      where: { id: orderId },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  });

  await invalidateOrderCache(restaurantId);
  return result;
};

/**
 * Transitions order: ACCEPTED (or PENDING) -> IN_PREPARATION
 */
export const startPreparation = async (restaurantId, orderId) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (!['PENDING', 'ACCEPTED', 'IN_PREPARATION'].includes(order.status)) {
      const error = new Error(`Cannot start preparation from status '${order.status}'. Order must be 'ACCEPTED' or 'PENDING'.`);
      error.statusCode = 409;
      throw error;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'IN_PREPARATION' },
    });
    await tx.orderItem.updateMany({
      where: { orderId, status: { in: ['PENDING'] } },
      data: { status: 'COOKING' },
    });
    return await tx.order.findUnique({
      where: { id: orderId },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  });

  await invalidateOrderCache(restaurantId);
  return result;
};

export const prepareOrder = startPreparation;

/**
 * Completes preparation: IN_PREPARATION -> READY
 * Automatically calculates recipe consumption, validates stock sufficiency,
 * deducts ingredients atomically, and writes InventoryTransaction audit records.
 * Idempotent: Repeated calls do NOT deduct stock again.
 */
export const markOrderReady = async (restaurantId, orderId) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    ingredients: {
                      include: { inventoryItem: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const unreadyItems = order.items.filter((i) => ['PENDING', 'COOKING'].includes(i.status));

    // Idempotency: If already READY or already inventoryDeducted with no new unready items, return order without deduction
    if (order.status === 'READY' || (order.inventoryDeducted && unreadyItems.length === 0)) {
      return order;
    }

    if (order.status === 'CANCELLED') {
      const error = new Error('Cannot mark a CANCELLED order as READY');
      error.statusCode = 400;
      throw error;
    }

    if (!['IN_PREPARATION', 'ACCEPTED'].includes(order.status)) {
      const error = new Error(
        `Cannot mark order READY from status '${order.status}'. Order must be 'ACCEPTED' or 'IN_PREPARATION'.`
      );
      error.statusCode = 409;
      throw error;
    }

    const itemsToDeduct = order.inventoryDeducted ? unreadyItems : order.items;

    const policy = await getRestaurantInventoryPolicy(restaurantId);
    if (policy?.autoDeductOnPreparation !== false) {
      // 1. Recipe validation: Check every menu item has a recipe configured
      for (const orderItem of order.items) {
        const menuItem = orderItem.menuItem;
        const recipe = menuItem?.recipe;
        if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
          const error = new Error(
            `Recipe is not configured for menu item '${menuItem?.name || 'Unknown'}'. Please configure recipe before completing preparation.`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      // 2. Multi-ingredient consumption calculation with unit conversion
      const deductions = new Map();

    for (const orderItem of order.items) {
      const recipe = orderItem.menuItem.recipe;
      const dishDesc = `${orderItem.quantity}x ${orderItem.menuItem.name}`;
      for (const ingredient of recipe.ingredients) {
        const invItem = ingredient.inventoryItem;
        if (!invItem) {
          const error = new Error(
            `Inventory item for ingredient not found in recipe of '${orderItem.menuItem.name}'`
          );
          error.statusCode = 404;
          throw error;
        }

          const requiredInRecipeUnit = Number(ingredient.quantityRequired) * orderItem.quantity;
          const requiredInInvUnit = convertQuantity(requiredInRecipeUnit, ingredient.unit, invItem.unit);

          const existing = deductions.get(invItem.id) || {
            inventoryItem: invItem,
            quantityToDeduct: 0,
            unit: invItem.unit,
            dishes: [],
          };

          existing.quantityToDeduct = Number((existing.quantityToDeduct + requiredInInvUnit).toFixed(4));
          existing.dishes.push(dishDesc);
          deductions.set(invItem.id, existing);
        }
      }

      // 3. Stock sufficiency pre-check
      for (const [invId, entry] of deductions.entries()) {
        const currentInv = await tx.inventoryItem.findFirst({
          where: { id: invId, restaurantId },
        });
        if (!currentInv) {
          const error = new Error(`Inventory item '${entry.inventoryItem.name}' not found`);
          error.statusCode = 404;
          throw error;
        }
        const available = Number(currentInv.currentStock);
        const required = entry.quantityToDeduct;
        if (available < required) {
          const shortage = Number((required - available).toFixed(4));
          const error = new Error(
            `Insufficient inventory for ingredient '${currentInv.name}'. Required: ${required} ${currentInv.unit}, Available: ${available} ${currentInv.unit}, Shortage: ${shortage} ${currentInv.unit}`
          );
          error.statusCode = 400;
          throw error;
        }
        entry.currentStock = available;
      }

      // 4. Atomic deduction and InventoryTransaction logging
      const dishSummary = order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(', ');

      for (const [invId, entry] of deductions.entries()) {
        const prevBalance = entry.currentStock;
        const newBalance = Number((prevBalance - entry.quantityToDeduct).toFixed(4));

        const updated = await tx.inventoryItem.updateMany({
          where: {
            id: invId,
            restaurantId,
            currentStock: { gte: entry.quantityToDeduct },
          },
          data: {
            currentStock: { decrement: entry.quantityToDeduct },
          },
        });

        if (updated.count !== 1) {
          const error = new Error(`Insufficient inventory for ingredient '${entry.inventoryItem.name}'`);
          error.statusCode = 400;
          throw error;
        }

        await tx.inventoryTransaction.create({
          data: {
            restaurantId,
            inventoryItemId: invId,
            orderId: order.id,
            type: 'CONSUMPTION',
            quantity: -entry.quantityToDeduct,
            unit: entry.unit,
            previousBalance: prevBalance,
            remainingBalance: newBalance,
            reference: `Order #${order.orderNumber}`,
            reason: dishSummary.length > 250 ? dishSummary.slice(0, 247) + '...' : dishSummary,
          },
        });
      }
    }

    // 5. Update unserved order items to READY
    await tx.orderItem.updateMany({
      where: { orderId: order.id, status: { in: ['PENDING', 'COOKING'] } },
      data: { status: 'READY' },
    });

    // 6. Update order status to READY with readyAt and inventoryDeducted flag
    return await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'READY',
        inventoryDeducted: true,
        readyAt: new Date(),
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
        inventoryTransactions: { include: { inventoryItem: true } },
      },
    });
  });

  await Promise.all([
    invalidateOrderCache(restaurantId),
    invalidateInventoryCache(restaurantId),
  ]);

  return result;
};

export const markReady = markOrderReady;

/**
 * Transitions order: READY -> SERVED
 */
export const markOrderServed = async (restaurantId, orderId) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (order.status !== 'READY') {
      const error = new Error(`Cannot transition order to 'SERVED' from status '${order.status}'. Order must be 'READY'.`);
      error.statusCode = 409;
      throw error;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'SERVED' },
    });
    await tx.orderItem.updateMany({
      where: { orderId },
      data: { status: 'SERVED' },
    });
    return await tx.order.findUnique({
      where: { id: orderId },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  });

  await invalidateOrderCache(restaurantId);
  return result;
};

/**
 * Completes order: SERVED (or READY) -> COMPLETED
 */
export const completeOrder = async (restaurantId, orderId) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
    });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (order.status === 'COMPLETED') {
      return order;
    }
    if (!['READY', 'SERVED'].includes(order.status)) {
      const error = new Error(`Cannot complete order from status '${order.status}'. Order must be 'READY' or 'SERVED'.`);
      error.statusCode = 409;
      throw error;
    }

    return await tx.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  });

  await Promise.all([
    invalidateOrderCache(restaurantId),
    invalidateTableCache(restaurantId),
  ]);

  return result;
};

/**
 * Cancels a kitchen order.
 */
export const cancelKitchenOrder = async (restaurantId, orderId) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
    });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (order.status === 'COMPLETED') {
      const error = new Error('Cannot cancel a completed kitchen order');
      error.statusCode = 400;
      throw error;
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    if (order.tableId) {
      const otherActive = await tx.order.findFirst({
        where: {
          tableId: order.tableId,
          id: { not: order.id },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });
      if (!otherActive) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return updated;
  });

  await Promise.all([
    invalidateOrderCache(restaurantId),
    invalidateTableCache(restaurantId),
  ]);

  return result;
};

/**
 * Generic status transition method validating legal kitchen flow.
 */
export const updateOrderStatus = async (restaurantId, orderId, nextStatus) => {
  const allowedNextStatuses = {
    PENDING: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['IN_PREPARATION', 'CANCELLED'],
    IN_PREPARATION: ['READY', 'CANCELLED'],
    READY: ['SERVED'],
    SERVED: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const allowed = allowedNextStatuses[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    const error = new Error(
      `Invalid order status transition from '${order.status}' to '${nextStatus}'. Allowed: ${allowed.join(', ') || 'None'}`
    );
    error.statusCode = 409;
    throw error;
  }

  if (nextStatus === 'ACCEPTED') return await acceptOrder(restaurantId, orderId);
  if (nextStatus === 'IN_PREPARATION') return await startPreparation(restaurantId, orderId);
  if (nextStatus === 'READY') return await markOrderReady(restaurantId, orderId);
  if (nextStatus === 'SERVED') return await markOrderServed(restaurantId, orderId);
  if (nextStatus === 'COMPLETED') return await completeOrder(restaurantId, orderId);
  if (nextStatus === 'CANCELLED') return await cancelKitchenOrder(restaurantId, orderId);

  throw new Error(`Unsupported status transition: '${nextStatus}'`);
};

export const updateItemStatus = async (restaurantId, itemId, status) => {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, order: { restaurantId } },
  });
  if (!item) {
    const error = new Error('Order item not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status },
    include: { menuItem: true },
  });

  await invalidateOrderCache(restaurantId);
  return updated;
};

/**
 * Returns inventory view for kitchen operations including consumption history.
 */
export const getKitchenInventory = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.search) {
    where.name = { contains: String(filters.search), mode: 'insensitive' };
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      recipeIngredients: {
        include: {
          recipe: {
            include: { menuItem: { select: { id: true, name: true } } },
          },
        },
      },
      inventoryTransactions: {
        where: { type: 'CONSUMPTION' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { name: 'asc' },
  });

  const policy = await getRestaurantInventoryPolicy(restaurantId);
  const defaultThreshold = Number(policy?.lowStockThresholdDefault) || 5;

  return items.map((item) => {
    const current = Number(item.currentStock);
    const threshold = getEffectiveThreshold(item, defaultThreshold);
    let stockStatus = 'IN_STOCK';
    if (current <= 0) stockStatus = 'OUT_OF_STOCK';
    else if (current <= threshold) stockStatus = 'LOW_STOCK';

    return {
      ...item,
      stockStatus,
      effectiveMinStockThreshold: threshold,
      isLowStock: current <= threshold,
      isOutOfStock: current <= 0,
      usedInDishes: item.recipeIngredients.map((ri) => ri.recipe.menuItem.name),
    };
  });
};

/**
 * Returns recipes for kitchen operations.
 */
export const getKitchenRecipes = async (restaurantId, filters = {}) => {
  return await findManyPaginated(
    prisma.recipe,
    {
      where: { menuItem: { restaurantId } },
      include: {
        menuItem: true,
        ingredients: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
    filters
  );
};

export default {
  getKitchenDashboard,
  getKitchenOrders,
  getKitchenOrderById,
  getPendingOrders,
  acceptOrder,
  startPreparation,
  prepareOrder,
  markOrderReady,
  markReady,
  markOrderServed,
  completeOrder,
  cancelKitchenOrder,
  updateOrderStatus,
  updateItemStatus,
  getKitchenInventory,
  getKitchenRecipes,
};
