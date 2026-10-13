import { prisma } from '../config/env.js';
import { serializableTransaction } from '../utils/transaction.js';
import { findManyPaginated } from '../utils/pagination.js';
import { validateOrderInventory } from './inventoryAvailability.service.js';

export const createOrder = async (restaurantId, waiterId, data) => {
  return await serializableTransaction(prisma, async (tx) => {
    // 1. Validate table if tableId is provided
    let table = null;
    if (data.tableId) {
      table = await tx.table.findFirst({
        where: { id: data.tableId, restaurantId },
      });
      if (!table) {
        const error = new Error('Specified table not found in this restaurant');
        error.statusCode = 404;
        throw error;
      }

      // Check if there is an active open order for this table FIRST
      const activeOrder = await tx.order.findFirst({
        where: {
          tableId: table.id,
          restaurantId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeOrder) {
        // Ensure table status reflects OCCUPIED
        if (table.status !== 'OCCUPIED') {
          await tx.table.update({
            where: { id: table.id },
            data: { status: 'OCCUPIED' },
          });
        }
        // Append items to the existing active order
        return await addItemsToExistingOrder(tx, restaurantId, activeOrder.id, data.items, data.notes);
      }

      if (table.status !== 'AVAILABLE') {
        const error = new Error(`Table is not available (current status: '${table.status}')`);
        error.statusCode = 409;
        throw error;
      }

      // Mark table as OCCUPIED
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      });
    }

    // 2. Validate menu items and inventory availability
    await validateOrderInventory(tx, restaurantId, data.items);

    const menuItemIds = data.items.map((i) => i.menuItemId);
    const menuItems = await tx.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId },
    });

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const orderItemsData = data.items.map((item) => {
      const menuItem = itemMap.get(item.menuItemId);
      if (!menuItem.isAvailable) {
        const error = new Error(`Menu item '${menuItem.name}' is currently unavailable`);
        error.statusCode = 400;
        throw error;
      }
      const unitPrice = Number(menuItem.price);
      const quantity = Number(item.quantity) || 1;
      const subtotal = unitPrice * quantity;

      return {
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        subtotal,
        notes: item.notes || null,
        status: 'PENDING',
      };
    });

    return await tx.order.create({
      data: {
        restaurantId,
        tableId: data.tableId || null,
        waiterId,
        orderNumber,
        status: 'PENDING',
        customerName: data.customerName || null,
        notes: data.notes || null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, role: true } },
        items: { include: { menuItem: true } },
      },
    });
  });
};

export const getOrders = async (restaurantId, filter = {}) => {
  const where = { restaurantId };
  if (filter.status) where.status = filter.status;
  if (filter.tableId) where.tableId = filter.tableId;
  if (filter.waiterId) where.waiterId = filter.waiterId;
  if (filter.startDate || filter.endDate) {
    where.createdAt = {};
    if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
    if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
  }

  return await findManyPaginated(prisma.order, {
    where,
    include: {
      table: true,
      waiter: { select: { id: true, name: true } },
      items: { include: { menuItem: true } },
      bill: true,
    },
    orderBy: { createdAt: 'desc' },
  }, filter);
};

export const getActiveOrders = async (restaurantId, filters = {}) => {
  return await findManyPaginated(prisma.order, {
    where: {
      restaurantId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    include: {
      table: true,
      waiter: { select: { id: true, name: true } },
      items: { include: { menuItem: true } },
      bill: true,
    },
    orderBy: { createdAt: 'desc' },
  }, filters);
};

export const getOrderById = async (restaurantId, id) => {
  const order = await prisma.order.findFirst({
    where: { id, restaurantId },
    include: {
      table: true,
      waiter: { select: { id: true, name: true, role: true } },
      items: {
        include: {
          menuItem: {
            include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } },
          },
        },
      },
      bill: { include: { payments: true } },
    },
  });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

export const updateOrder = async (restaurantId, id, data) => {
  const order = await getOrderById(restaurantId, id);
  if (order.status !== 'PENDING') {
    const error = new Error('Only pending orders can be edited');
    error.statusCode = 409;
    throw error;
  }

  return await prisma.order.update({
    where: { id },
    data: {
      notes: data.notes !== undefined ? data.notes : undefined,
      customerName: data.customerName !== undefined ? data.customerName : undefined,
    },
    include: {
      table: true,
      items: { include: { menuItem: true } },
    },
  });
};

export const cancelOrder = async (restaurantId, id) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, restaurantId },
    });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status === 'COMPLETED') {
      const error = new Error('Cannot cancel a completed order');
      error.statusCode = 400;
      throw error;
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { table: true },
    });

    if (order.tableId) {
      const otherActiveOrders = await tx.order.findFirst({
        where: {
          tableId: order.tableId,
          id: { not: order.id },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });
      if (!otherActiveOrders) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return updatedOrder;
  });
};

export const addItemsToExistingOrder = async (tx, restaurantId, orderId, items, additionalNotes) => {
  const order = await tx.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { items: true, bill: true },
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
    const error = new Error(`Cannot add items to order in '${order.status}' status`);
    error.statusCode = 400;
    throw error;
  }

  if (order.bill && order.bill.status !== 'VOID') {
    const error = new Error('A bill has already been generated for this table. Please ask Reception to void or update the bill before adding new items.');
    error.statusCode = 409;
    throw error;
  }

  // Validate menu items and inventory availability
  await validateOrderInventory(tx, restaurantId, items);

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await tx.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId },
  });

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const item of items) {
    const menuItem = itemMap.get(item.menuItemId);
    if (!menuItem.isAvailable) {
      const error = new Error(`Menu item '${menuItem.name}' is currently unavailable`);
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = Number(menuItem.price);
    const quantity = Number(item.quantity) || 1;
    const subtotal = unitPrice * quantity;

    // Check if item already exists in PENDING status with identical notes to merge quantity
    const existingItem = order.items.find(
      (it) => it.menuItemId === item.menuItemId && it.status === 'PENDING' && (it.notes || '') === (item.notes || '')
    );

    if (existingItem) {
      const nextQty = existingItem.quantity + quantity;
      await tx.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: nextQty,
          subtotal: unitPrice * nextQty,
        },
      });
    } else {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity,
          unitPrice,
          subtotal,
          notes: item.notes || null,
          status: 'PENDING',
        },
      });
    }
  }

  // If order was already READY or SERVED, set status back to IN_PREPARATION so kitchen prepares new items
  const nextStatus = ['READY', 'SERVED'].includes(order.status) ? 'IN_PREPARATION' : order.status;
  const nextNotes = additionalNotes ? (order.notes ? `${order.notes} | ${additionalNotes}` : additionalNotes) : order.notes;

  return await tx.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      notes: nextNotes,
      billRequested: false,
      billRequestedAt: null,
    },
    include: {
      table: true,
      waiter: { select: { id: true, name: true, role: true } },
      items: { include: { menuItem: true } },
      bill: true,
    },
  });
};

export const addItemsToOrder = async (restaurantId, waiterId, orderId, data) => {
  return await serializableTransaction(prisma, async (tx) => {
    return await addItemsToExistingOrder(tx, restaurantId, orderId, data.items || [], data.notes);
  });
};

export const requestBill = async (restaurantId, waiterId, orderId) => {
  return await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        bill: true,
      },
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      const error = new Error(`Cannot request bill for order in '${order.status}' status`);
      error.statusCode = 400;
      throw error;
    }

    if (!order.items || order.items.length === 0) {
      const error = new Error('Cannot request bill for an empty order');
      error.statusCode = 400;
      throw error;
    }

    if (order.bill && order.bill.status !== 'VOID') {
      return order; // Bill already generated and active
    }

    return await tx.order.update({
      where: { id: order.id },
      data: {
        billRequested: true,
        billRequestedAt: new Date(),
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, role: true } },
        items: { include: { menuItem: true } },
        bill: true,
      },
    });
  });
};

export const cancelBillRequest = async (restaurantId, orderId) => {
  return await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { bill: true },
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.bill && order.bill.status !== 'VOID') {
      const error = new Error('Bill has already been generated by Reception. Ask Reception to void the bill.');
      error.statusCode = 409;
      throw error;
    }

    return await tx.order.update({
      where: { id: order.id },
      data: {
        billRequested: false,
        billRequestedAt: null,
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, role: true } },
        items: { include: { menuItem: true } },
        bill: true,
      },
    });
  });
};

export const markServed = async (restaurantId, orderId, waiterId) => {
  return await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (order.status !== 'READY') {
      const error = new Error(`Order can only be marked as SERVED when it is in 'READY' status. Current status: '${order.status}'`);
      error.statusCode = 409;
      throw error;
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'SERVED',
        servedAt: new Date(),
        servedById: waiterId || undefined,
      },
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
};

export const sendToKitchen = async (restaurantId, orderId, waiterId) => {
  return await serializableTransaction(prisma, async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true, table: true },
    });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      const error = new Error(`Cannot send an order with status '${order.status}' to the kitchen`);
      error.statusCode = 400;
      throw error;
    }

    const nextStatus = order.status === 'PENDING' ? 'ACCEPTED' : (['READY', 'SERVED'].includes(order.status) ? 'IN_PREPARATION' : order.status);
    return await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  });
};

export const updateOrderStatus = async (restaurantId, orderId, nextStatus) => {
  if (nextStatus === 'SERVED') {
    return await markServed(restaurantId, orderId);
  }
  if (nextStatus === 'CANCELLED') {
    return await cancelOrder(restaurantId, orderId);
  }
  const error = new Error(`Invalid status transition to '${nextStatus}' via order service`);
  error.statusCode = 400;
  throw error;
};

export const validateCartAvailability = async (restaurantId, items) => {
  return await prisma.$transaction(async (tx) => {
    await validateOrderInventory(tx, restaurantId, items);
    return { isValid: true };
  });
};

export default {
  createOrder,
  getOrders,
  getActiveOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  addItemsToOrder,
  requestBill,
  cancelBillRequest,
  markServed,
  updateOrderStatus,
  validateCartAvailability,
};
