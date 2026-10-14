import { prisma } from '../config/env.js';
import { cachedQuery, buildCacheKey, invalidateSuperAdminCache } from '../utils/cache.js';

export const getPlans = async (onlyActive = true) => {
  const cacheKey = buildCacheKey('global', 'superadmin:plans', { onlyActive });
  return await cachedQuery(cacheKey, 60, async () => {
    const where = onlyActive ? { isActive: true } : {};
    const plans = await prisma.plan.findMany({
      where,
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
    return plans.map((p) => ({
      ...p,
      activeSubscribers: p._count.subscriptions,
    }));
  });
};

export const getPlanById = async (id) => {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
  if (!plan) {
    const error = new Error('Subscription plan not found');
    error.statusCode = 404;
    throw error;
  }
  return {
    ...plan,
    activeSubscribers: plan._count.subscriptions,
  };
};

export const createPlan = async (data) => {
  const name = data.name.trim();
  const existing = await prisma.plan.findUnique({
    where: { name },
  });
  if (existing) {
    const error = new Error(`Plan named '${name}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  const created = await prisma.plan.create({
    data: {
      name,
      description: data.description?.trim() || null,
      price: data.price !== undefined ? Number(data.price) : 0,
      durationDays: Number(data.durationDays) || 30,
      maxStaff: Number(data.maxStaff) || 14,
      maxWaiters: data.maxWaiters !== undefined ? Number(data.maxWaiters) : 10,
      maxKitchenAdmins: data.maxKitchenAdmins !== undefined ? Number(data.maxKitchenAdmins) : 2,
      maxReceptionists: data.maxReceptionists !== undefined ? Number(data.maxReceptionists) : 2,
      maxTables: Number(data.maxTables) || 10,
      maxMenuItems: Number(data.maxMenuItems) || 50,
      features: Array.isArray(data.features) ? data.features : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });

  await invalidateSuperAdminCache();
  return created;
};

export const updatePlan = async (id, data) => {
  await getPlanById(id);

  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.price !== undefined) updateData.price = Number(data.price);
  if (data.durationDays !== undefined) updateData.durationDays = Number(data.durationDays);
  if (data.maxStaff !== undefined) updateData.maxStaff = Number(data.maxStaff);
  if (data.maxWaiters !== undefined) updateData.maxWaiters = Number(data.maxWaiters);
  if (data.maxKitchenAdmins !== undefined) updateData.maxKitchenAdmins = Number(data.maxKitchenAdmins);
  if (data.maxReceptionists !== undefined) updateData.maxReceptionists = Number(data.maxReceptionists);
  if (data.maxTables !== undefined) updateData.maxTables = Number(data.maxTables);
  if (data.maxMenuItems !== undefined) updateData.maxMenuItems = Number(data.maxMenuItems);
  if (Array.isArray(data.features)) updateData.features = data.features;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  const updated = await prisma.plan.update({
    where: { id },
    data: updateData,
  });

  await invalidateSuperAdminCache();
  return updated;
};

export const updatePlanStatus = async (id, isActive) => {
  await getPlanById(id);
  const updated = await prisma.plan.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
  });

  await invalidateSuperAdminCache();
  return updated;
};

export default {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  updatePlanStatus,
};
