import { prisma } from '../config/env.js';

/**
 * Returns comprehensive, real-time database-derived operational KPIs and table telemetry for the Waiter.
 * Scoped strictly by restaurantId.
 */
export const getWaiterDashboard = async (restaurantId, waiterId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 1. Concurrent DB queries for tables, orders, and bills
  const [
    tables,
    activeOrders,
    servedTodayCount,
    unpaidBills,
    deliveredBillsCount,
    paidTodayBillsCount,
  ] = await Promise.all([
    // All tables with active orders
    prisma.table.findMany({
      where: { restaurantId },
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
          take: 1,
        },
      },
    }),

    // All active non-completed orders in restaurant
    prisma.order.findMany({
      where: {
        restaurantId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        bill: true,
        waiter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Served orders today
    prisma.order.count({
      where: {
        restaurantId,
        status: 'SERVED',
        updatedAt: { gte: startOfDay },
      },
    }),

    // All unpaid bills
    prisma.bill.findMany({
      where: {
        restaurantId,
        status: 'UNPAID',
      },
      include: {
        order: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Delivered bills count
    prisma.bill.count({
      where: {
        restaurantId,
        isDelivered: true,
      },
    }),

    // Paid bills today
    prisma.bill.count({
      where: {
        restaurantId,
        status: 'PAID',
        updatedAt: { gte: startOfDay },
      },
    }),
  ]);

  // 2. Table Overview calculations
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;

  const tablesWithActiveOrders = tables.filter((t) => t.orders && t.orders.length > 0).length;

  const tablesWaitingForService = tables.filter(
    (t) => t.orders && t.orders.length > 0 && t.orders[0].status === 'READY'
  ).length;

  const tablesWaitingForBilling = tables.filter((t) => {
    if (!t.orders || t.orders.length === 0) return false;
    const order = t.orders[0];
    return order.status === 'SERVED' && (!order.bill || order.bill.status === 'UNPAID');
  }).length;

  // 3. Order Overview calculations
  const newOrders = activeOrders.filter((o) => o.status === 'PENDING').length;
  const preparingOrders = activeOrders.filter((o) =>
    ['ACCEPTED', 'IN_PREPARATION'].includes(o.status)
  ).length;
  const readyOrders = activeOrders.filter((o) => o.status === 'READY').length;
  const activeServedOrders = activeOrders.filter((o) => o.status === 'SERVED').length;

  // 4. Bill Overview calculations
  const pendingBills = unpaidBills.length;
  const readyToDeliverBills = unpaidBills.filter((b) => !b.isDelivered).length;

  // 5. Table-wise Order Status mapping
  const tableOrders = tables.map((t) => {
    const currentOrder = t.orders && t.orders.length > 0 ? t.orders[0] : null;

    let operationalStatus = t.status;
    let action = 'NEW_ORDER';

    if (currentOrder) {
      if (currentOrder.status === 'SERVED' && currentOrder.bill && !currentOrder.bill.isDelivered) {
        operationalStatus = 'BILL_READY';
        action = 'DELIVER_BILL';
      } else if (currentOrder.bill && currentOrder.bill.status === 'PAID') {
        operationalStatus = 'COMPLETED';
        action = 'AVAILABLE';
      } else if (currentOrder.status === 'READY') {
        operationalStatus = 'READY';
        action = 'SERVE';
      } else if (['ACCEPTED', 'IN_PREPARATION'].includes(currentOrder.status)) {
        operationalStatus = 'PREPARING';
        action = 'ADD_ITEMS';
      } else if (currentOrder.status === 'PENDING') {
        operationalStatus = 'ORDERING';
        action = 'ADD_ITEMS';
      } else if (currentOrder.status === 'SERVED') {
        operationalStatus = 'SERVED';
        action = 'WAIT_BILL';
      }
    } else {
      operationalStatus = t.status;
      action = t.status === 'AVAILABLE' ? 'NEW_ORDER' : 'VIEW';
    }

    const itemsSummary = currentOrder?.items?.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ') || '';

    return {
      tableId: t.id,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      tableStatus: t.status,
      operationalStatus,
      action,
      currentOrder: currentOrder
        ? {
            id: currentOrder.id,
            orderNumber: currentOrder.orderNumber,
            status: currentOrder.status,
            billRequested: Boolean(currentOrder.billRequested),
            billRequestedAt: currentOrder.billRequestedAt,
            customerName: currentOrder.customerName,
            notes: currentOrder.notes,
            itemsCount: currentOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            itemsSummary,
            items: currentOrder.items,
            createdAt: currentOrder.createdAt,
            readyAt: currentOrder.readyAt,
            servedAt: currentOrder.servedAt,
            waiterName: currentOrder.waiter?.name || 'Unassigned',
            bill: currentOrder.bill
              ? {
                  id: currentOrder.bill.id,
                  billNumber: currentOrder.bill.billNumber,
                  totalAmount: Number(currentOrder.bill.totalAmount),
                  status: currentOrder.bill.status,
                  isDelivered: currentOrder.bill.isDelivered,
                }
              : null,
          }
        : null,
    };
  });

  // 6. Ready Order Notifications
  const readyNotifications = activeOrders
    .filter((o) => o.status === 'READY')
    .map((o) => ({
      id: `ready-${o.id}`,
      orderId: o.id,
      orderNumber: o.orderNumber,
      tableId: o.tableId,
      tableNumber: o.table?.tableNumber || 'Takeaway',
      itemsCount: o.items?.reduce((acc, i) => acc + i.quantity, 0) || 0,
      readyAt: o.readyAt || o.updatedAt,
      message: `Order #${o.orderNumber} for Table ${o.table?.tableNumber || 'Takeaway'} is Ready`,
    }));

  // 7. Ready Bill Notifications (Unpaid bills generated by Receptionist ready for delivery)
  const billNotifications = unpaidBills
    .filter((b) => !b.isDelivered)
    .map((b) => ({
      id: `bill-${b.id}`,
      billId: b.id,
      billNumber: b.billNumber,
      tableNumber: b.order?.table?.tableNumber || 'Counter',
      orderNumber: b.order?.orderNumber,
      totalAmount: Number(b.totalAmount),
      createdAt: b.createdAt,
      message: `Bill for Table ${b.order?.table?.tableNumber || 'Counter'} is Ready (${b.billNumber})`,
    }));

  return {
    tableOverview: {
      totalTables,
      availableTables,
      occupiedTables,
      tablesWithActiveOrders,
      tablesWaitingForService,
      tablesWaitingForBilling,
    },
    orderOverview: {
      newOrders,
      preparingOrders,
      readyOrders,
      servedOrders: activeServedOrders,
    },
    billOverview: {
      pendingBills,
      readyToDeliverBills,
      deliveredBills: deliveredBillsCount,
      completedBills: paidTodayBillsCount,
    },
    tableOrders,
    tableWiseActiveOrders: tableOrders,
    readyNotifications,
    readyOrders: readyNotifications,
    billNotifications,
    readyBills: billNotifications,
  };
};

export default {
  getWaiterDashboard,
};
