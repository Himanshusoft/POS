import { prisma } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

export const onboardRestaurant = async (data) => {
  const ownerEmail = (data.ownerEmail || data.email).trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });
  if (existing) {
    const error = new Error('An account with this owner email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Determine subscription plan
  let selectedPlanId = data.planId;
  if (!selectedPlanId) {
    const defaultPlan = await prisma.plan.findFirst({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    if (defaultPlan) {
      selectedPlanId = defaultPlan.id;
    }
  }

  let selectedPlan = null;
  if (selectedPlanId) {
    selectedPlan = await prisma.plan.findUnique({ where: { id: selectedPlanId } });
  }

  const rawPassword = data.ownerPassword || data.password || 'Password123';
  const hashedPassword = await hashPassword(rawPassword);

  return await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: (data.restaurantName || data.name).trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.restaurantEmail?.trim() || ownerEmail,
        currency: data.currency?.trim() || '₹',
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 5.0,
        isActive: true,
      },
    });

    const owner = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: (data.ownerName || data.name).trim(),
        email: ownerEmail,
        password: hashedPassword,
        role: 'RESTAURANT_OWNER',
        phone: data.ownerPhone || data.phone || null,
        isActive: true,
      },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    let subscription = null;
    if (selectedPlan) {
      subscription = await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          planId: selectedPlan.id,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + (selectedPlan.durationDays || 30) * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });
    }

    return {
      restaurant: {
        ...restaurant,
        subscription,
      },
      owner: {
        ...owner,
        assignedPassword: rawPassword,
      },
    };
  });
};

export const getRestaurants = async (filters = {}) => {
  const where = {};
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === 'true' || filters.isActive === true;
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const restaurants = await prisma.restaurant.findMany({
    where,
    include: {
      users: {
        select: { id: true, name: true, email: true, phone: true, isActive: true, role: true },
      },
      subscription: {
        include: {
          plan: true,
        },
      },
      _count: {
        select: {
          users: true,
          tables: true,
          orders: true,
          menuItems: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return restaurants.map((r) => {
    const owner = r.users.find((u) => u.role === 'RESTAURANT_OWNER') || null;
    const waitersCount = r.users.filter((u) => u.role === 'WAITER').length;
    const kitchenAdminsCount = r.users.filter((u) => u.role === 'KITCHEN_ADMIN').length;
    const receptionistsCount = r.users.filter((u) => u.role === 'RECEPTIONIST').length;

    return {
      ...r,
      owner,
      roleCounts: {
        waiters: waitersCount,
        kitchenAdmins: kitchenAdminsCount,
        receptionists: receptionistsCount,
      },
      stats: r._count,
    };
  });
};

export const getRestaurantById = async (id) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
      },
      subscription: {
        include: { plan: true },
      },
      _count: {
        select: {
          tables: true,
          orders: true,
          menuItems: true,
          inventoryItems: true,
        },
      },
    },
  });

  if (!restaurant) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }

  const owner = restaurant.users.find((u) => u.role === 'RESTAURANT_OWNER') || null;
  const staff = restaurant.users.filter((u) => u.role !== 'RESTAURANT_OWNER');

  return {
    ...restaurant,
    owner,
    staff,
    stats: restaurant._count,
  };
};

export const updateRestaurantStatus = async (id, isActive) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.restaurant.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });
};

export const updateRestaurantSubscription = async (restaurantId, data) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { subscription: true },
  });

  if (!restaurant) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }

  const { planId, status, durationDays } = data;

  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      const error = new Error('Specified subscription plan not found');
      error.statusCode = 404;
      throw error;
    }
  }

  let updatedSubscription;
  if (restaurant.subscription) {
    const updateData = {};
    if (planId) updateData.planId = planId;
    if (status) updateData.status = status;
    if (durationDays) {
      updateData.endDate = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
    }

    updatedSubscription = await prisma.subscription.update({
      where: { id: restaurant.subscription.id },
      data: updateData,
      include: { plan: true },
    });
  } else if (planId) {
    const days = durationDays || 30;
    updatedSubscription = await prisma.subscription.create({
      data: {
        restaurantId,
        planId,
        status: status || 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });
  }

  return updatedSubscription;
};

export const resetOwnerCredentials = async (restaurantId, data) => {
  const owner = await prisma.user.findFirst({
    where: { restaurantId, role: 'RESTAURANT_OWNER' },
  });

  if (!owner) {
    const error = new Error('No owner registered for this restaurant');
    error.statusCode = 404;
    throw error;
  }

  const newPassword = data.newPassword || data.password || 'Password123';
  const hashedPassword = await hashPassword(newPassword);

  const updated = await prisma.user.update({
    where: { id: owner.id },
    data: {
      password: hashedPassword,
      email: data.newEmail ? data.newEmail.trim().toLowerCase() : undefined,
      name: data.name ? data.name.trim() : undefined,
      phone: data.phone ? data.phone.trim() : undefined,
    },
    select: { id: true, name: true, email: true, role: true, phone: true, updatedAt: true },
  });

  return {
    owner: updated,
    assignedPassword: newPassword,
  };
};

export const getPlatformOverview = async () => {
  const [
    totalRestaurants,
    activeRestaurants,
    inactiveRestaurants,
    totalPlatformUsers,
    subscriptions,
    plans,
    recentRestaurants,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.restaurant.count({ where: { isActive: false } }),
    prisma.user.count(),
    prisma.subscription.findMany({ select: { status: true } }),
    prisma.plan.findMany({
      include: {
        _count: { select: { subscriptions: true } },
      },
    }),
    prisma.restaurant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'RESTAURANT_OWNER' },
          select: { name: true, email: true },
        },
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: { users: true, tables: true, orders: true },
        },
      },
    }),
  ]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const suspendedSubscriptions = subscriptions.filter((s) => s.status === 'SUSPENDED').length;
  const expiredSubscriptions = subscriptions.filter((s) => s.status === 'EXPIRED').length;

  return {
    totalRestaurants,
    activeRestaurants,
    inactiveRestaurants,
    totalPlatformUsers,
    activeSubscriptions,
    suspendedSubscriptions,
    expiredSubscriptions,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      maxStaff: p.maxStaff,
      maxTables: p.maxTables,
      maxMenuItems: p.maxMenuItems,
      activeSubscribers: p._count.subscriptions,
      isActive: p.isActive,
    })),
    recentTenants: recentRestaurants.map((r) => ({
      id: r.id,
      name: r.name,
      owner: r.users[0] || null,
      plan: r.subscription?.plan?.name || 'No Plan',
      status: r.isActive ? (r.subscription?.status || 'ACTIVE') : 'SUSPENDED',
      createdAt: r.createdAt,
      stats: r._count,
    })),
  };
};

export const getPlatformAnalytics = async (range = '30D') => {
  const rangeDaysMap = {
    '30D': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  };
  const days = rangeDaysMap[String(range).toUpperCase()] || 30;
  const now = new Date();
  const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  const [restaurants, subscriptions, users] = await Promise.all([
    prisma.restaurant.findMany({
      select: { id: true, createdAt: true, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.subscription.findMany({
      select: {
        id: true,
        restaurantId: true,
        planId: true,
        status: true,
        startDate: true,
        createdAt: true,
        plan: { select: { price: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, createdAt: true, role: true, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalTenants = restaurants.length;
  const activeTenants = restaurants.filter((r) => r.isActive).length;
  const suspendedTenants = restaurants.filter((r) => !r.isActive).length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const totalUsers = users.length;
  const totalContractARR = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + Number(s.plan?.price || 0), 0);

  // Determine interval step in days for clean charting
  let stepDays = 1;
  if (days <= 30) stepDays = 2;
  else if (days <= 90) stepDays = 5;
  else if (days <= 180) stepDays = 10;
  else stepDays = 20;

  // Generate bucket timestamps from rangeStart to now
  const buckets = [];
  let currentMs = rangeStart.getTime();
  const nowMs = now.getTime();
  while (currentMs < nowMs) {
    buckets.push(new Date(currentMs));
    currentMs += stepDays * 24 * 60 * 60 * 1000;
  }
  buckets.push(now);

  const tenantPoints = buckets.map((b) => {
    const label = b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = restaurants.filter((r) => new Date(r.createdAt) <= b).length;
    return { label, value: count, date: b.toISOString() };
  });

  const subPoints = buckets.map((b) => {
    const label = b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = subscriptions.filter((s) => new Date(s.createdAt) <= b && s.status === 'ACTIVE').length;
    return { label, value: count, date: b.toISOString() };
  });

  const userPoints = buckets.map((b) => {
    const label = b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = users.filter((u) => new Date(u.createdAt) <= b).length;
    return { label, value: count, date: b.toISOString() };
  });

  const revPoints = buckets.map((b) => {
    const label = b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const rev = subscriptions
      .filter((s) => new Date(s.createdAt) <= b && s.status === 'ACTIVE')
      .reduce((sum, s) => sum + Number(s.plan?.price || 0), 0);
    return { label, value: rev, date: b.toISOString() };
  });

  // Calculate real growth/change if previous period data exists (never fabricate percentages)
  const newTenantsCurrent = restaurants.filter((r) => new Date(r.createdAt) >= rangeStart && new Date(r.createdAt) <= now).length;
  const newTenantsPrev = restaurants.filter((r) => new Date(r.createdAt) >= prevStart && new Date(r.createdAt) < rangeStart).length;

  const newSubsCurrent = subscriptions.filter((s) => new Date(s.createdAt) >= rangeStart && new Date(s.createdAt) <= now).length;
  const newSubsPrev = subscriptions.filter((s) => new Date(s.createdAt) >= prevStart && new Date(s.createdAt) < rangeStart).length;

  const newUsersCurrent = users.filter((u) => new Date(u.createdAt) >= rangeStart && new Date(u.createdAt) <= now).length;
  const newUsersPrev = users.filter((u) => new Date(u.createdAt) >= prevStart && new Date(u.createdAt) < rangeStart).length;

  const calcChange = (curr, prev) => {
    if (prev > 0) {
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    }
    return null; // Return null when no historical comparison exists so no fake % is shown
  };

  return {
    range,
    summary: {
      registeredTenants: totalTenants,
      activeTenants,
      suspendedTenants,
      activeSubscriptions,
      platformUsers: totalUsers,
      totalRevenue: totalContractARR,
    },
    metrics: {
      tenants: {
        label: 'Registered Tenants',
        current: totalTenants,
        changePct: calcChange(newTenantsCurrent, newTenantsPrev),
        data: tenantPoints,
        unit: 'tenants',
      },
      subscriptions: {
        label: 'Active Subscriptions',
        current: activeSubscriptions,
        changePct: calcChange(newSubsCurrent, newSubsPrev),
        data: subPoints,
        unit: 'subscriptions',
      },
      users: {
        label: 'Platform Users',
        current: totalUsers,
        changePct: calcChange(newUsersCurrent, newUsersPrev),
        data: userPoints,
        unit: 'users',
      },
      revenue: {
        label: 'Subscription ARR',
        current: totalContractARR,
        currency: '₹',
        changePct: null,
        data: revPoints,
        unit: 'ARR',
      },
    },
  };
};

export default {
  onboardRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurantStatus,
  updateRestaurantSubscription,
  resetOwnerCredentials,
  getPlatformOverview,
  getPlatformAnalytics,
};
