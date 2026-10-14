import { prisma } from '../config/env.js';
import { serializableTransaction } from '../utils/transaction.js';
import { findManyPaginated } from '../utils/pagination.js';
import { invalidateBillingCache, invalidateOrderCache, cachedQuery, buildCacheKey } from '../utils/cache.js';

export const generateBill = async (restaurantId, receptionistId, data) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: data.orderId, restaurantId },
      include: {
        items: true,
        restaurant: true,
        bill: true,
      },
    });

    if (!order) {
      const error = new Error('Order not found in this restaurant');
      error.statusCode = 404;
      throw error;
    }

    if (order.bill && order.bill.status !== 'VOID') {
      const error = new Error('A bill has already been generated for this order.');
      error.statusCode = 409;
      throw error;
    }

    if (order.status !== 'SERVED') {
      const error = new Error('Order is not eligible for billing. The order must be served first.');
      error.statusCode = 400;
      throw error;
    }

    if (!order.items || order.items.length === 0 || order.items.some((item) => item.status !== 'SERVED')) {
      const error = new Error('Order is not eligible for billing. The order must be served first.');
      error.statusCode = 400;
      throw error;
    }

    if (order.billRequested) {
      await tx.order.update({
        where: { id: order.id },
        data: { billRequested: false },
      });
    }

    // Calculate subtotal from order items
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += Number(item.subtotal);
    }

    const taxRate = order.restaurant.taxRate !== undefined ? Number(order.restaurant.taxRate) : 5.0;
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
    const discountAmount = data.discountAmount !== undefined ? Number(Number(data.discountAmount).toFixed(2)) : 0;
    const totalAmount = Math.max(0, Number((subtotal + taxAmount - discountAmount).toFixed(2)));

    const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return await tx.bill.create({
      data: {
        restaurantId,
        orderId: order.id,
        receptionistId,
        billNumber,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        totalAmount,
        status: 'UNPAID',
      },
      include: {
        order: { include: { items: { include: { menuItem: true } }, table: true } },
        receptionist: { select: { id: true, name: true } },
      },
    });
  });

  await Promise.all([
    invalidateBillingCache(restaurantId),
    invalidateOrderCache(restaurantId),
  ]);

  return result;
};

export const createBill = async (restaurantId, receptionistId, data) => {
  return await generateBill(restaurantId, receptionistId, data);
};

export const getBillById = async (restaurantId, id) => {
  const bill = await prisma.bill.findFirst({
    where: { id, restaurantId },
    include: {
      order: { include: { items: { include: { menuItem: true } }, table: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      receptionist: { select: { id: true, name: true } },
    },
  });
  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }
  return { ...bill, paymentStatus: bill.status };
};

export const getBillByOrderId = async (restaurantId, orderId) => {
  const bill = await prisma.bill.findFirst({
    where: { orderId, restaurantId },
    include: {
      order: { include: { items: { include: { menuItem: true } }, table: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      receptionist: { select: { id: true, name: true } },
    },
  });
  if (!bill) {
    const error = new Error('Bill not found for this order');
    error.statusCode = 404;
    throw error;
  }
  return { ...bill, paymentStatus: bill.status };
};

export const getAllBills = async (restaurantId, status = null, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'billing', { status, ...filters });
  return await cachedQuery(cacheKey, 15, async () => {
    const where = { restaurantId };
    if (status) where.status = status;

    const result = await findManyPaginated(prisma.bill, {
      where,
      include: {
        order: {
          include: {
            table: true,
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        receptionist: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }, filters);

    result.items = result.items.map((b) => ({
      ...b,
      paymentStatus: b.status,
    }));

    return result;
  });
};

export const getBills = async (restaurantId, status = null, filters = {}) => {
  return await getAllBills(restaurantId, status, filters);
};

export const updateBill = async (restaurantId, id, data) => {
  const bill = await getBillById(restaurantId, id);
  if (bill.status === 'PAID') {
    const error = new Error('Cannot update an already PAID bill');
    error.statusCode = 400;
    throw error;
  }
  if (bill.payments.length > 0) {
    const error = new Error('A bill with recorded payments cannot be changed');
    error.statusCode = 409;
    throw error;
  }

  const subtotal = Number(bill.subtotal);
  const taxRate = Number(bill.taxRate);
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Number(bill.discountAmount);
  const totalAmount = Math.max(0, Number((subtotal + taxAmount - discountAmount).toFixed(2)));

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      discountAmount,
      totalAmount,
    },
    include: {
      order: true,
      payments: true,
    },
  });

  await invalidateBillingCache(restaurantId);
  return updated;
};

export const getPendingBillingOrders = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'billing', { type: 'pending-orders', ...filters });
  return await cachedQuery(cacheKey, 8, async () => {
    return await findManyPaginated(
      prisma.order,
      {
        where: {
          restaurantId,
          bill: null,
          OR: [
            { billRequested: true, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
            { status: { in: ['READY', 'SERVED', 'COMPLETED'] } },
          ],
        },
        include: {
          table: true,
          waiter: { select: { id: true, name: true } },
          items: { include: { menuItem: true } },
        },
        orderBy: [
          { billRequested: 'desc' },
          { createdAt: 'desc' },
        ],
      },
      filters
    );
  });
};

export const deliverBill = async (restaurantId, id, waiterId) => {
  const bill = await prisma.bill.findFirst({
    where: { id, restaurantId },
    include: { order: { include: { table: true } } },
  });
  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }
  if (bill.status === 'VOID') {
    const error = new Error('Cannot deliver a voided bill');
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.bill.update({
    where: { id },
    data: {
      isDelivered: true,
      deliveredAt: new Date(),
      deliveredById: waiterId || undefined,
    },
    include: {
      order: { include: { table: true } },
      payments: true,
      deliveredBy: { select: { id: true, name: true } },
    },
  });

  await invalidateBillingCache(restaurantId);
  return updated;
};

export default {
  generateBill,
  createBill,
  getBillById,
  getBillByOrderId,
  getAllBills,
  getBills,
  updateBill,
  getPendingBillingOrders,
  deliverBill,
};
