import { prisma } from '../config/env.js';
import { findManyPaginated } from '../utils/pagination.js';
import { serializableTransaction } from '../utils/transaction.js';
import { invalidateInventoryCache, cachedQuery, buildCacheKey } from '../utils/cache.js';

export const createInventoryItem = async (restaurantId, data) => {
  const name = data.name.trim();
  const existing = await prisma.inventoryItem.findUnique({
    where: {
      restaurantId_name: {
        restaurantId,
        name,
      },
    },
  });
  if (existing) {
    const error = new Error(`Inventory item '${name}' already exists in this restaurant`);
    error.statusCode = 409;
    throw error;
  }

  const rawStock = data.currentStock !== undefined ? data.currentStock : data.openingStock;
  const rawMin = data.minStockThreshold !== undefined
    ? data.minStockThreshold
    : (data.minSafeLevel !== undefined ? data.minSafeLevel : data.minStockLevel);
  const rawCost = data.costPerUnit !== undefined
    ? data.costPerUnit
    : (data.costPrice !== undefined ? data.costPrice : data.cost);

  const initialStock = rawStock !== undefined && rawStock !== null && rawStock !== '' ? Number(rawStock) : 0;
  const minThreshold = rawMin !== undefined && rawMin !== null && rawMin !== '' ? Number(rawMin) : 5;
  const cost = rawCost !== undefined && rawCost !== null && rawCost !== '' ? Number(rawCost) : 0;

  const item = await serializableTransaction(prisma, async (tx) => {
    const createdItem = await tx.inventoryItem.create({
      data: {
        restaurantId,
        name,
        sku: data.sku ? String(data.sku).trim() : null,
        currentStock: initialStock,
        minStockThreshold: minThreshold,
        unit: data.unit,
        costPerUnit: cost,
      },
    });

    if (initialStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          restaurantId,
          inventoryItemId: createdItem.id,
          type: 'PURCHASE',
          quantity: initialStock,
          unit: createdItem.unit,
          previousBalance: 0,
          remainingBalance: initialStock,
          reason: 'Initial Opening Stock',
          reference: 'Opening Inventory Balance',
        },
      });
    }

    return createdItem;
  });

  await invalidateInventoryCache(restaurantId);
  return item;
};

export const getInventoryTransactions = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.type && filters.type !== 'ALL') {
    where.type = filters.type;
  }
  if (filters.inventoryItemId) {
    where.inventoryItemId = filters.inventoryItemId;
  }
  if (filters.search) {
    where.OR = [
      { reason: { contains: String(filters.search), mode: 'insensitive' } },
      { reference: { contains: String(filters.search), mode: 'insensitive' } },
      { inventoryItem: { name: { contains: String(filters.search), mode: 'insensitive' } } },
      { inventoryItem: { sku: { contains: String(filters.search), mode: 'insensitive' } } },
    ];
  }
  return await findManyPaginated(prisma.inventoryTransaction, {
    where,
    include: {
      inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
    },
    orderBy: { createdAt: 'desc' },
  }, filters);
};

export const getInventoryItems = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'inventory:items', filters);
  return await cachedQuery(cacheKey, 20, async () => {
    const where = { restaurantId };
    if (filters.unit) where.unit = filters.unit;
    if (filters.search) {
      where.OR = [
        { name: { contains: String(filters.search), mode: 'insensitive' } },
        { sku: { contains: String(filters.search), mode: 'insensitive' } },
      ];
    }
    return await findManyPaginated(prisma.inventoryItem, {
      where,
      orderBy: { name: 'asc' },
    }, filters);
  });
};

export const getLowStockItems = async (restaurantId) => {
  const cacheKey = buildCacheKey(restaurantId, 'inventory', { type: 'low-stock' });
  return await cachedQuery(cacheKey, 30, async () => {
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { currentStock: 'asc' },
    });
    return items.filter((i) => Number(i.currentStock) <= Number(i.minStockThreshold));
  });
};

export const getInventoryItemById = async (restaurantId, id) => {
  const item = await prisma.inventoryItem.findFirst({
    where: { id, restaurantId },
    include: {
      recipeIngredients: { include: { recipe: { include: { menuItem: true } } } },
    },
  });
  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }
  return item;
};

export const updateInventoryItem = async (restaurantId, id, data) => {
  await getInventoryItemById(restaurantId, id);

  const rawStock = data.currentStock !== undefined ? data.currentStock : data.openingStock;
  const rawMin = data.minStockThreshold !== undefined
    ? data.minStockThreshold
    : (data.minSafeLevel !== undefined ? data.minSafeLevel : data.minStockLevel);
  const rawCost = data.costPerUnit !== undefined
    ? data.costPerUnit
    : (data.costPrice !== undefined ? data.costPrice : data.cost);

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      sku: data.sku !== undefined ? (data.sku ? String(data.sku).trim() : null) : undefined,
      currentStock: rawStock !== undefined ? Number(rawStock) : undefined,
      minStockThreshold: rawMin !== undefined ? Number(rawMin) : undefined,
      unit: data.unit || undefined,
      costPerUnit: rawCost !== undefined ? Number(rawCost) : undefined,
    },
  });

  await invalidateInventoryCache(restaurantId);
  return updated;
};

export const updateStock = async (restaurantId, id, data) => {
  const item = await getInventoryItemById(restaurantId, id);

  let newStock;
  if (data.currentStock !== undefined) {
    newStock = Number(data.currentStock);
  } else if (data.adjustment !== undefined) {
    newStock = Number(item.currentStock) + Number(data.adjustment);
  }

  if (newStock < 0) {
    const error = new Error(`Stock cannot be negative. Current stock is ${item.currentStock} ${item.unit}`);
    error.statusCode = 400;
    throw error;
  }

  let updatedItem;
  if (data.adjustment !== undefined) {
    const result = await prisma.inventoryItem.updateMany({
      where: {
        id,
        restaurantId,
        ...(Number(data.adjustment) < 0 ? { currentStock: { gte: Math.abs(Number(data.adjustment)) } } : {}),
      },
      data: { currentStock: { increment: Number(data.adjustment) } },
    });
    if (!result.count) {
      const error = new Error('Stock adjustment would make inventory negative');
      error.statusCode = 422;
      throw error;
    }
    updatedItem = await getInventoryItemById(restaurantId, id);
  } else {
    await prisma.inventoryItem.updateMany({
      where: { id, restaurantId },
      data: { currentStock: newStock },
    });
    updatedItem = await getInventoryItemById(restaurantId, id);
  }

  await invalidateInventoryCache(restaurantId);
  return updatedItem;
};

export const deleteInventoryItem = async (restaurantId, id) => {
  const item = await prisma.inventoryItem.findFirst({
    where: { id, restaurantId },
    include: { _count: { select: { recipeIngredients: true, purchaseItems: true, wastages: true } } },
  });
  if (!item) {
    const error = new Error('Inventory item not found');
    error.statusCode = 404;
    throw error;
  }
  if (item._count.recipeIngredients || item._count.purchaseItems || item._count.wastages) {
    const error = new Error('Inventory item has recipe, purchase, or wastage history and cannot be deleted');
    error.statusCode = 409;
    throw error;
  }
  const deleted = await prisma.inventoryItem.delete({
    where: { id },
  });

  await invalidateInventoryCache(restaurantId);
  return deleted;
};

export const adjustStock = async (restaurantId, id, data, user = {}) => {
  const rawAdjustment = data.quantityAdjustment !== undefined
    ? data.quantityAdjustment
    : (data.quantity !== undefined ? data.quantity : data.adjustment);

  const adjustment = Number(rawAdjustment);
  if (!Number.isFinite(adjustment)) {
    const error = new Error('quantityAdjustment must be a valid number');
    error.statusCode = 400;
    throw error;
  }

  if (adjustment === 0) {
    const error = new Error('quantityAdjustment cannot be zero');
    error.statusCode = 400;
    throw error;
  }

  const reason = data.reason ? String(data.reason).trim() : 'Manual Stock Adjustment';
  const auditNotes = data.auditNotes !== undefined ? data.auditNotes : (data.notes !== undefined ? data.notes : null);

  const result = await serializableTransaction(prisma, async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id, restaurantId },
      include: {
        recipeIngredients: { include: { recipe: { include: { menuItem: true } } } },
      },
    });

    if (!item) {
      const error = new Error('Inventory item not found');
      error.statusCode = 404;
      throw error;
    }

    const currentStockNum = Number(item.currentStock);
    const newStockNum = Number((currentStockNum + adjustment).toFixed(4));

    if (newStockNum < 0) {
      const error = new Error('Insufficient stock. Stock cannot become negative.');
      error.statusCode = 400;
      throw error;
    }

    const updateWhere = {
      id,
      restaurantId,
      ...(adjustment < 0 ? { currentStock: { gte: Math.abs(adjustment) } } : {}),
    };

    const updateResult = await tx.inventoryItem.updateMany({
      where: updateWhere,
      data: { currentStock: newStockNum },
    });

    if (!updateResult.count) {
      const error = new Error('Insufficient stock. Stock cannot become negative.');
      error.statusCode = 400;
      throw error;
    }

    const reference = auditNotes && String(auditNotes).trim()
      ? String(auditNotes).trim()
      : (user?.name ? `Adjusted by ${user.name}` : null);

    await tx.inventoryTransaction.create({
      data: {
        restaurantId,
        inventoryItemId: id,
        type: 'ADJUSTMENT',
        quantity: adjustment,
        unit: item.unit,
        previousBalance: currentStockNum,
        remainingBalance: newStockNum,
        reason,
        reference,
      },
    });

    return await tx.inventoryItem.findFirst({
      where: { id, restaurantId },
      include: {
        recipeIngredients: { include: { recipe: { include: { menuItem: true } } } },
      },
    });
  });

  await invalidateInventoryCache(restaurantId);
  return result;
};

export default {
  createInventoryItem,
  getInventoryItems,
  getInventoryTransactions,
  getLowStockItems,
  getInventoryItemById,
  updateInventoryItem,
  updateStock,
  adjustStock,
  deleteInventoryItem,
};

