import { prisma } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { cachedQuery, buildCacheKey, invalidateSuperAdminCache } from '../utils/cache.js';

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

  const result = await prisma.$transaction(async (tx) => {
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

  await invalidateSuperAdminCache();
  return result;
};

export const getRestaurants = async (filters = {}) => {
  const cacheKey = buildCacheKey('global', 'superadmin:restaurants', filters);
  return await cachedQuery(cacheKey, 20, async () => {
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

  const updated = await prisma.restaurant.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  await invalidateSuperAdminCache();
  return updated;
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

  await invalidateSuperAdminCache();
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
  const cacheKey = buildCacheKey('global', 'superadmin', { type: 'overview' });
  return await cachedQuery(cacheKey, 30, async () => {
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
  });
};

export default {
  onboardRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurantStatus,
  updateRestaurantSubscription,
  resetOwnerCredentials,
  getPlatformOverview,
};
