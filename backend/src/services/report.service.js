import { prisma } from '../config/env.js';
import { cachedQuery, buildCacheKey } from '../utils/cache.js';

export const getSalesReport = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'reports:sales', filters);
  return await cachedQuery(cacheKey, 30, async () => {
    const where = { restaurantId, status: 'PAID' };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [bills, payments, totalOrders] = await Promise.all([
      prisma.bill.findMany({
        where,
        select: {
          totalAmount: true,
          taxAmount: true,
          discountAmount: true,
          subtotal: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { bill: where, status: 'COMPLETED' },
        select: { amount: true, method: true },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          ...(filters.startDate || filters.endDate
            ? {
                createdAt: {
                  ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                  ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    const totalRevenue = bills.reduce((acc, b) => acc + Number(b.totalAmount), 0);
    const totalTax = bills.reduce((acc, b) => acc + Number(b.taxAmount), 0);
    const totalDiscount = bills.reduce((acc, b) => acc + Number(b.discountAmount), 0);
    const totalSubtotal = bills.reduce((acc, b) => acc + Number(b.subtotal), 0);

    const paymentBreakdown = payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
      return acc;
    }, {});

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalPaidBills: bills.length,
      totalOrders,
      paymentBreakdown,
    };
  });
};

export const getOrdersReport = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.status) where.status = filters.status;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const orders = await prisma.order.findMany({
    where,
    select: { status: true },
  });

  const statusBreakdown = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalOrders: orders.length,
    statusBreakdown,
  };
};

export const getPaymentsReport = async (restaurantId, filters = {}) => {
  const where = { bill: { restaurantId }, status: 'COMPLETED' };
  if (filters.method) where.method = filters.method;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const payments = await prisma.payment.findMany({
    where,
    select: { amount: true, method: true, status: true, createdAt: true },
  });

  const totalAmountCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const methodBreakdown = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
    return acc;
  }, {});

  return {
    totalPaymentsCount: payments.length,
    totalAmountCollected: Number(totalAmountCollected.toFixed(2)),
    methodBreakdown,
  };
};

export const getInventoryReport = async (restaurantId) => {
  const items = await prisma.inventoryItem.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
  });

  const totalItems = items.length;
  const totalValuation = items.reduce(
    (acc, i) => acc + Number(i.currentStock) * Number(i.costPerUnit || 0),
    0
  );
  const lowStockItems = items.filter((i) => Number(i.currentStock) <= Number(i.minStockThreshold));

  return {
    totalItems,
    totalValuation: Number(totalValuation.toFixed(2)),
    lowStockCount: lowStockItems.length,
    lowStockItems,
  };
};

export const getWastageReport = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const wastages = await prisma.wastage.findMany({
    where,
    include: { inventoryItem: true },
    orderBy: { createdAt: 'desc' },
  });

  const totalWastageCost = wastages.reduce((acc, w) => acc + Number(w.cost || 0), 0);

  return {
    totalEntries: wastages.length,
    totalWastageCost: Number(totalWastageCost.toFixed(2)),
    wastages,
  };
};

export const getPurchasesReport = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.startDate || filters.endDate) {
    where.purchaseDate = {};
    if (filters.startDate) where.purchaseDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.purchaseDate.lte = new Date(filters.endDate);
  }

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: true },
    orderBy: { purchaseDate: 'desc' },
  });

  const totalPurchasesSpending = purchases.reduce((acc, p) => acc + Number(p.totalAmount), 0);
  const statusBreakdown = purchases.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalPurchases: purchases.length,
    totalPurchasesSpending: Number(totalPurchasesSpending.toFixed(2)),
    statusBreakdown,
  };
};

export const getFinancialReport = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'reports:financials', filters);
  return await cachedQuery(cacheKey, 30, async () => {
    const dateFilter = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Boolean(filters.startDate || filters.endDate);

    const [payments, purchases, wastages] = await Promise.all([
      // 1. REVENUE (Money in)
      prisma.payment.findMany({
      where: {
        bill: { restaurantId },
        status: 'COMPLETED',
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        bill: {
          include: {
            order: {
              include: { table: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // 2. PURCHASES EXPENSES (Money out)
    prisma.purchase.findMany({
      where: {
        restaurantId,
        ...(hasDateFilter ? { purchaseDate: dateFilter } : {}),
      },
      include: {
        supplier: true,
        items: { include: { inventoryItem: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    }),

    // 3. WASTAGE EXPENSES (Money out)
    prisma.wastage.findMany({
      where: {
        restaurantId,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        inventoryItem: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Aggregate Revenue
  const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const revenueByMethod = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
    return acc;
  }, {});

  // Aggregate Expenses
  const totalPurchasesExpense = purchases.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
  const totalWastageExpense = wastages.reduce((acc, w) => acc + Number(w.cost || 0), 0);
  const totalExpenses = totalPurchasesExpense + totalWastageExpense;

  // Net Profit / Net Revenue
  const netAmount = totalRevenue - totalExpenses;

  // Chronological Unified Ledger Entries
  const ledger = [];

  for (const pay of payments) {
    const tableNum = pay.bill?.order?.table?.tableNumber || pay.bill?.order?.tableId || 'Takeaway';
    ledger.push({
      id: `PAY-${pay.id}`,
      date: pay.createdAt,
      type: 'SALE',
      category: 'REVENUE',
      method: pay.method,
      amount: Number(Number(pay.amount).toFixed(2)),
      description: `Customer Bill #${pay.bill?.billNumber || pay.billId.slice(0, 6)} (Table #${tableNum})`,
      ref: pay.transactionReference || null,
    });
  }

  for (const pur of purchases) {
    const itemNames = pur.items?.map((it) => it.inventoryItem?.name).filter(Boolean).slice(0, 3).join(', ');
    ledger.push({
      id: `PUR-${pur.id}`,
      date: pur.purchaseDate || pur.createdAt,
      type: 'EXPENSE',
      category: 'PURCHASE',
      method: 'INVOICE',
      amount: -Number(Number(pur.totalAmount).toFixed(2)),
      description: `Purchase: ${pur.supplier?.name || 'Vendor'} (${itemNames || 'Raw Materials'})`,
      ref: pur.invoiceNumber || null,
    });
  }

  for (const wst of wastages) {
    ledger.push({
      id: `WST-${wst.id}`,
      date: wst.createdAt,
      type: 'EXPENSE',
      category: 'WASTAGE',
      method: 'LOSS',
      amount: -Number(Number(wst.cost || 0).toFixed(2)),
      description: `Spoilage/Waste: ${wst.quantity} ${wst.inventoryItem?.unit || ''} ${wst.inventoryItem?.name || 'Stock'} (${wst.reason})`,
      ref: wst.notes || null,
    });
  }

  ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    breakdown: {
      revenueByMethod,
      purchasesExpense: Number(totalPurchasesExpense.toFixed(2)),
      wastageExpense: Number(totalWastageExpense.toFixed(2)),
    },
    counts: {
      salesTransactions: payments.length,
      purchaseOrders: purchases.length,
      wastageIncidents: wastages.length,
    },
    ledger: ledger.slice(0, 100), // Return recent 100 ledger transactions
  };
  });
};

export const getPurchaseReport = getPurchasesReport;

export const getAdminDashboardSummary = async (restaurantId) => {
  const cacheKey = buildCacheKey(restaurantId, 'reports:dashboard', {});
  return await cachedQuery(cacheKey, 30, async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

  const [
    billsAll,
    billsToday,
    paymentsAll,
    ordersAll,
    purchasesAll,
    wastagesAll,
    inventoryItems,
    users,
    subscription,
    popularOrderItems,
  ] = await Promise.all([
    prisma.bill.findMany({
      where: { restaurantId, status: 'PAID' },
      select: { totalAmount: true, subtotal: true, taxAmount: true, discountAmount: true, createdAt: true },
    }),
    prisma.bill.findMany({
      where: { restaurantId, status: 'PAID', createdAt: { gte: todayStart } },
      select: { totalAmount: true },
    }),
    prisma.payment.findMany({
      where: { bill: { restaurantId }, status: 'COMPLETED' },
      select: { amount: true, method: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { restaurantId },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.purchase.findMany({
      where: { restaurantId },
      select: { totalAmount: true },
    }),
    prisma.wastage.findMany({
      where: { restaurantId },
      select: { cost: true },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId },
      select: { id: true, name: true, sku: true, currentStock: true, minStockThreshold: true, unit: true, costPerUnit: true },
      orderBy: { currentStock: 'asc' },
    }),
    prisma.user.findMany({
      where: { restaurantId },
      select: { id: true, name: true, role: true, isActive: true },
    }),
    prisma.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { restaurantId, status: { not: 'CANCELLED' } } },
      include: {
        menuItem: { select: { id: true, name: true, price: true, category: { select: { name: true } } } },
      },
    }),
  ]);

  const totalRevenue = billsAll.reduce((acc, b) => acc + Number(b.totalAmount), 0);
  const todayRevenue = billsToday.reduce((acc, b) => acc + Number(b.totalAmount), 0);
  const totalSubtotal = billsAll.reduce((acc, b) => acc + Number(b.subtotal), 0);
  const totalTax = billsAll.reduce((acc, b) => acc + Number(b.taxAmount), 0);
  const totalDiscount = billsAll.reduce((acc, b) => acc + Number(b.discountAmount), 0);

  const purchasesTotal = purchasesAll.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
  const wastageTotal = wastagesAll.reduce((acc, w) => acc + Number(w.cost || 0), 0);
  const totalExpenses = purchasesTotal + wastageTotal;
  const netProfit = totalRevenue - totalExpenses;

  const totalOrders = ordersAll.length;
  const activeOrders = ordersAll.filter((o) => ['PENDING', 'IN_PREPARATION', 'READY', 'SERVED'].includes(o.status)).length;
  const completedOrders = ordersAll.filter((o) => o.status === 'COMPLETED').length;

  const paymentMethodStats = {};
  let totalPaymentsAmount = 0;
  for (const pay of paymentsAll) {
    const amt = Number(pay.amount);
    totalPaymentsAmount += amt;
    const methodKey = pay.method || 'CASH';
    if (!paymentMethodStats[methodKey]) {
      paymentMethodStats[methodKey] = { method: methodKey, amount: 0, count: 0, percentage: 0 };
    }
    paymentMethodStats[methodKey].amount += amt;
    paymentMethodStats[methodKey].count += 1;
  }
  const paymentInsights = Object.values(paymentMethodStats).map((p) => ({
    ...p,
    amount: Number(p.amount.toFixed(2)),
    percentage: totalPaymentsAmount > 0 ? Number(((p.amount / totalPaymentsAmount) * 100).toFixed(1)) : 0,
  }));

  const dishMap = {};
  for (const oi of popularOrderItems) {
    if (!oi.menuItem) continue;
    const mId = oi.menuItem.id;
    if (!dishMap[mId]) {
      dishMap[mId] = {
        id: mId,
        name: oi.menuItem.name,
        category: oi.menuItem.category?.name || 'General',
        price: Number(oi.menuItem.price),
        quantitySold: 0,
        revenueGenerated: 0,
      };
    }
    dishMap[mId].quantitySold += oi.quantity;
    dishMap[mId].revenueGenerated += Number(oi.subtotal || oi.quantity * Number(oi.menuItem.price));
  }
  const popularDishes = Object.values(dishMap)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 6)
    .map((d) => ({
      ...d,
      revenueGenerated: Number(d.revenueGenerated.toFixed(2)),
    }));

  const lowStockItems = inventoryItems.filter(
    (item) => Number(item.currentStock) <= Number(item.minStockThreshold)
  );

  const staffMembers = users.filter((u) => u.role !== 'RESTAURANT_OWNER');
  const staffStats = {
    total: staffMembers.length,
    active: staffMembers.filter((u) => u.isActive).length,
    inactive: staffMembers.filter((u) => !u.isActive).length,
    waiters: staffMembers.filter((u) => u.role === 'WAITER').length,
    kitchenAdmins: staffMembers.filter((u) => u.role === 'KITCHEN_ADMIN').length,
    receptionists: staffMembers.filter((u) => u.role === 'RECEPTIONIST').length,
    planLimits: {
      maxWaiters: subscription?.plan?.maxWaiters ?? 10,
      maxKitchenAdmins: subscription?.plan?.maxKitchenAdmins ?? 2,
      maxReceptionists: subscription?.plan?.maxReceptionists ?? 2,
    },
  };

  return {
    sales: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      todayRevenue: Number(todayRevenue.toFixed(2)),
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalPaidBills: billsAll.length,
    },
    expenses: {
      totalExpenses: Number(totalExpenses.toFixed(2)),
      purchasesTotal: Number(purchasesTotal.toFixed(2)),
      wastageTotal: Number(wastageTotal.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    },
    orders: {
      totalOrders,
      activeOrders,
      completedOrders,
    },
    paymentInsights,
    popularDishes,
    inventoryAlerts: {
      totalItems: inventoryItems.length,
      lowStockCount: lowStockItems.length,
      items: lowStockItems.slice(0, 8),
    },
    staff: staffStats,
  };
  });
};

export default {
  getSalesReport,
  getOrdersReport,
  getPaymentsReport,
  getInventoryReport,
  getWastageReport,
  getPurchasesReport,
  getPurchaseReport,
  getFinancialReport,
  getAdminDashboardSummary,
};
