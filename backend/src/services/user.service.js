import { prisma } from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { findManyPaginated } from '../utils/pagination.js';
import { cachedQuery, buildCacheKey, invalidateUserCache } from '../utils/cache.js';
import { validatePhoneField } from '../utils/countryPhoneData.js';

export const createStaff = async (restaurantId, data) => {
  if (!restaurantId) {
    const error = new Error('Organization context is required to create staff');
    error.statusCode = 400;
    throw error;
  }
  const email = data.email.trim().toLowerCase();

  let phoneValue = null;
  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    const phoneCheck = validatePhoneField(data.phone, data.countryCode || data.phoneCountry || data.country);
    if (!phoneCheck.isValid) {
      const error = new Error(phoneCheck.error);
      error.statusCode = 400;
      throw error;
    }
    phoneValue = phoneCheck.normalized;
  }

  const hashedPassword = await hashPassword(data.password);

  const newUser = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const error = new Error('A user with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    // Enforce Subscription Plan Role-Specific Staff Limits (10 Waiters, 2 Kitchen Admins, 2 Receptionists)
    const subscription = await tx.subscription.findUnique({
      where: { restaurantId },
      include: { plan: true },
    });
    const plan = (subscription && subscription.status === 'ACTIVE' && subscription.plan)
      ? subscription.plan
      : null;
    const maxWaiters = plan?.maxWaiters ?? 10;
    const maxChefs = plan?.maxKitchenAdmins ?? 2;
    const maxRec = plan?.maxReceptionists ?? 2;

    if (data.role === 'WAITER') {
      const waiterCount = await tx.user.count({ where: { restaurantId, role: 'WAITER' } });
      if (waiterCount >= maxWaiters) {
        const error = new Error(
          `Waiter capacity reached (${waiterCount}/${maxWaiters}). Upgrade your subscription or free an existing seat before adding another Waiter.`
        );
        error.statusCode = 422;
        throw error;
      }
    } else if (data.role === 'KITCHEN_ADMIN') {
      const chefCount = await tx.user.count({ where: { restaurantId, role: 'KITCHEN_ADMIN' } });
      if (chefCount >= maxChefs) {
        const error = new Error(
          `Kitchen Admin capacity reached (${chefCount}/${maxChefs}). Upgrade your subscription or free an existing seat before adding another Kitchen Admin.`
        );
        error.statusCode = 422;
        throw error;
      }
    } else if (data.role === 'RECEPTIONIST') {
      const recCount = await tx.user.count({ where: { restaurantId, role: 'RECEPTIONIST' } });
      if (recCount >= maxRec) {
        const error = new Error(
          `Receptionist capacity reached (${recCount}/${maxRec}). Upgrade your subscription or free an existing seat before adding another Receptionist.`
        );
        error.statusCode = 422;
        throw error;
      }
    }

    return await tx.user.create({
      data: {
        restaurantId,
        name: data.name,
        email,
        password: hashedPassword,
        role: data.role,
        phone: phoneValue,
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
  });

  await invalidateUserCache(restaurantId);
  return { ...newUser, organizationId: newUser.restaurantId };
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
  const existingUser = await getStaffById(restaurantId, id);

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.phone !== undefined) {
    if (data.phone === null || data.phone === '') {
      updateData.phone = null;
    } else {
      const phoneCheck = validatePhoneField(data.phone, data.countryCode || data.phoneCountry || data.country);
      if (!phoneCheck.isValid) {
        const error = new Error(phoneCheck.error);
        error.statusCode = 400;
        throw error;
      }
      updateData.phone = phoneCheck.normalized;
    }
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  const isRoleChanging = Boolean(data.role && data.role !== existingUser.role);
  if (data.role) {
    updateData.role = data.role;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (isRoleChanging) {
      const subscription = await tx.subscription.findUnique({
        where: { restaurantId },
        include: { plan: true },
      });
      const plan = (subscription && subscription.status === 'ACTIVE' && subscription.plan)
        ? subscription.plan
        : null;
      const maxWaiters = plan?.maxWaiters ?? 10;
      const maxChefs = plan?.maxKitchenAdmins ?? 2;
      const maxRec = plan?.maxReceptionists ?? 2;

      const targetRole = data.role;
      // Exclude current staff member from target count
      const targetCount = await tx.user.count({
        where: {
          restaurantId,
          role: targetRole,
          NOT: { id },
        },
      });

      if (targetRole === 'WAITER' && targetCount >= maxWaiters) {
        const error = new Error(
          `Waiter capacity reached (${targetCount}/${maxWaiters}). Upgrade your subscription or free an existing seat before reassigning to Waiter.`
        );
        error.statusCode = 422;
        throw error;
      } else if (targetRole === 'KITCHEN_ADMIN' && targetCount >= maxChefs) {
        const error = new Error(
          `Kitchen Admin capacity reached (${targetCount}/${maxChefs}). Upgrade your subscription or free an existing seat before reassigning to Kitchen Admin.`
        );
        error.statusCode = 422;
        throw error;
      } else if (targetRole === 'RECEPTIONIST' && targetCount >= maxRec) {
        const error = new Error(
          `Receptionist capacity reached (${targetCount}/${maxRec}). Upgrade your subscription or free an existing seat before reassigning to Receptionist.`
        );
        error.statusCode = 422;
        throw error;
      }
    }

    return await tx.user.update({
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
