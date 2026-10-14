import { prisma } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { findManyPaginated } from '../utils/pagination.js';
import { cachedQuery, buildCacheKey, invalidateUserCache } from '../utils/cache.js';

export const createStaff = async (restaurantId, data) => {
  const email = data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    const error = new Error('A user with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // Enforce Subscription Plan Role-Specific Staff Limits (10 Waiters, 2 Kitchen Admins, 2 Receptionists)
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId },
    include: { plan: true },
  });
  if (subscription && subscription.status === 'ACTIVE' && subscription.plan) {
    const plan = subscription.plan;
    if (data.role === 'WAITER') {
      const waiterCount = await prisma.user.count({ where: { restaurantId, role: 'WAITER' } });
      const maxWaiters = plan.maxWaiters ?? 10;
      if (waiterCount >= maxWaiters) {
        const error = new Error(`Waiter limit reached for your ${plan.name} (${maxWaiters} max). Cannot add more waiters.`);
        error.statusCode = 422;
        throw error;
      }
    } else if (data.role === 'KITCHEN_ADMIN') {
      const chefCount = await prisma.user.count({ where: { restaurantId, role: 'KITCHEN_ADMIN' } });
      const maxChefs = plan.maxKitchenAdmins ?? 2;
      if (chefCount >= maxChefs) {
        const error = new Error(`Kitchen Admin limit reached for your ${plan.name} (${maxChefs} max). Cannot add more kitchen admins.`);
        error.statusCode = 422;
        throw error;
      }
    } else if (data.role === 'RECEPTIONIST') {
      const recCount = await prisma.user.count({ where: { restaurantId, role: 'RECEPTIONIST' } });
      const maxRec = plan.maxReceptionists ?? 2;
      if (recCount >= maxRec) {
        const error = new Error(`Receptionist limit reached for your ${plan.name} (${maxRec} max). Cannot add more receptionists.`);
        error.statusCode = 422;
        throw error;
      }
    }
  }

  const hashedPassword = await hashPassword(data.password);

  const newUser = await prisma.user.create({
    data: {
      restaurantId,
      name: data.name,
      email,
      password: hashedPassword,
      role: data.role,
      phone: data.phone || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
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

  await invalidateUserCache(restaurantId);
  return newUser;
};

export const getStaffList = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'users', filters);
  return await cachedQuery(cacheKey, 30, async () => {
    return await findManyPaginated(prisma.user, {
      where: { restaurantId },
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
      orderBy: { createdAt: 'desc' },
    }, filters);
  });
};

export const getStaffById = async (restaurantId, id) => {
  const user = await prisma.user.findFirst({
    where: { id, restaurantId },
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
  if (!user) {
    const error = new Error('Staff member not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const updateStaff = async (restaurantId, id, data) => {
  // Verify user belongs to same restaurant
  await getStaffById(restaurantId, id);

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      restaurantId: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      updatedAt: true,
    },
  });

  await invalidateUserCache(restaurantId, id);
  return updated;
};

export const updateStaffStatus = async (restaurantId, id, isActive) => {
  await getStaffById(restaurantId, id);

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: {
      id: true,
      restaurantId: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      updatedAt: true,
    },
  });

  await invalidateUserCache(restaurantId, id);
  return updated;
};

export const deleteStaff = async (restaurantId, id) => {
  await getStaffById(restaurantId, id);
  const deleted = await prisma.user.delete({
    where: { id },
  });

  await invalidateUserCache(restaurantId, id);
  return deleted;
};

export default {
  createStaff,
  getStaffList,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
};
