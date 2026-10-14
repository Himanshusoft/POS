import { prisma } from '../config/env.js';
import { findManyPaginated } from '../utils/pagination.js';
import { cachedQuery, buildCacheKey, invalidateTableCache } from '../utils/cache.js';

export const createTable = async (restaurantId, data) => {
  const tableNumber = String(data.tableNumber).trim();
  const existing = await prisma.table.findUnique({
    where: {
      restaurantId_tableNumber: {
        restaurantId,
        tableNumber,
      },
    },
  });

  if (existing) {
    const error = new Error(`Table '${tableNumber}' already exists in this restaurant`);
    error.statusCode = 409;
    throw error;
  }

  // Enforce Subscription Plan Dining Tables Limits
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId },
    include: { plan: true },
  });
  if (subscription && subscription.status === 'ACTIVE' && subscription.plan) {
    const currentTableCount = await prisma.table.count({ where: { restaurantId } });
    if (currentTableCount >= subscription.plan.maxTables) {
      const error = new Error(`Dining table limit reached for your ${subscription.plan.name} (${subscription.plan.maxTables} max). Please contact Super Admin to upgrade.`);
      error.statusCode = 422;
      throw error;
    }
  }

  const result = await prisma.table.create({
    data: {
      restaurantId,
      tableNumber,
      capacity: Number(data.capacity) || 4,
      status: data.status || 'AVAILABLE',
    },
  });
  await invalidateTableCache(restaurantId);
  return result;
};

export const getTables = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'tables', filters);
  return await cachedQuery(cacheKey, 15, async () => {
    const where = { restaurantId };
    if (filters.status) where.status = filters.status;

    const result = await findManyPaginated(prisma.table, {
      where,
      orderBy: { tableNumber: 'asc' },
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            items: { include: { menuItem: true } },
            waiter: { select: { id: true, name: true } },
            bill: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    }, filters);

    result.items = result.items.map((t) => ({
      ...t,
      activeOrders: t.orders || [],
    }));

    return result;
  });
};

export const getTableById = async (restaurantId, id) => {
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
    include: {
      orders: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: {
          items: { include: { menuItem: true } },
          waiter: { select: { id: true, name: true } },
          bill: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!table) {
    const error = new Error('Table not found');
    error.statusCode = 404;
    throw error;
  }
  return {
    ...table,
    activeOrders: table.orders || [],
  };
};

export const updateTable = async (restaurantId, id, data) => {
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
  });
  if (!table) {
    const error = new Error('Table not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.tableNumber && data.tableNumber !== table.tableNumber) {
    const existing = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId,
          tableNumber: data.tableNumber,
        },
      },
    });
    if (existing) {
      const error = new Error(`Table '${data.tableNumber}' already exists`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updated = await prisma.table.update({
    where: { id },
    data: {
      tableNumber: data.tableNumber !== undefined ? data.tableNumber : table.tableNumber,
      capacity: data.capacity !== undefined ? Number(data.capacity) : table.capacity,
      status: data.status !== undefined ? data.status : table.status,
    },
  });
  await invalidateTableCache(restaurantId);
  return updated;
};

export const updateTableStatus = async (restaurantId, id, status) => {
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
  });
  if (!table) {
    const error = new Error('Table not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await prisma.table.update({
    where: { id },
    data: { status },
  });
  await invalidateTableCache(restaurantId);
  return updated;
};

export const deleteTable = async (restaurantId, id) => {
  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
  });
  if (!table) {
    const error = new Error('Table not found');
    error.statusCode = 404;
    throw error;
  }
  const deleted = await prisma.table.delete({
    where: { id },
  });
  await invalidateTableCache(restaurantId);
  return deleted;
};

export default {
  createTable,
  getTables,
  getTableById,
  updateTable,
  updateTableStatus,
  deleteTable,
};
