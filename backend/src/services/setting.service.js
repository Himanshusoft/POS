import { prisma } from '../config/env.js';
import { cachedQuery, buildCacheKey, invalidateSettingsCache, invalidateInventoryCache } from '../utils/cache.js';
import { normalizeCurrencyCode } from '../validations/resource.validation.js';

// Default configuration blueprints per scope and key
export const DEFAULT_SETTINGS = {
  PLATFORM: {
    platform_general: {
      platformName: 'POS Enterprise Cloud',
      supportEmail: 'support@pos.com',
      supportPhone: '+1 (800) 555-POS',
      maintenanceMode: false,
      allowNewRegistrations: true,
      defaultPlanDurationDays: 365,
    },
    platform_system: {
      sessionTimeoutMinutes: 120,
      auditLogging: true,
      requireStrongPasswords: true,
    },
  },
  RESTAURANT: {
    restaurant_operations: {
      serviceChargeRate: 0,
      gstNumber: '',
      autoPrintReceipt: true,
      orderHoldTimeoutMinutes: 30,
      enableTableOrdering: true,
    },
    restaurant_kitchen: {
      autoAcceptOrders: false,
      alertCookingTimeMinutes: 20,
      soundOnNewOrder: true,
      defaultTicketDensity: 'comfortable',
    },
    restaurant_billing: {
      invoicePrefix: 'INV-',
      defaultPaymentMethod: 'CASH',
      roundOffTotal: true,
      footerMessage: 'Thank you for dining with us! Please visit again.',
    },
    restaurant_inventory: {
      autoDeductOnPreparation: true,
      lowStockThresholdDefault: 5,
      notifyLowStockOnLogin: true,
    },
  },
  USER: {
    user_preferences: {
      theme: 'dark',
      soundAlerts: true,
      orderNotifications: true,
      defaultScreen: 'dashboard',
      density: 'comfortable',
      quickCash: false,
    },
  },
};

/**
 * Generate canonical scope key for uniqueness
 */
export const buildScopeKey = (scope, identifier, key) => {
  if (scope === 'PLATFORM') return `PLATFORM:${key}`;
  if (scope === 'RESTAURANT') return `RESTAURANT:${identifier}:${key}`;
  if (scope === 'USER') return `USER:${identifier}:${key}`;
  throw new Error(`Unsupported settings scope: ${scope}`);
};

/**
 * Retrieve all settings relevant to the authenticated user's role and tenant
 */
export const getSettingsForUser = async (user) => {
  const cacheKey = buildCacheKey(user.restaurantId || 'global', 'settings', { userId: user.id });
  return await cachedQuery(cacheKey, 60, async () => {
    const result = {
      scope: user.role === 'RESTAURANT_REGISTRATION_ADMIN' ? 'PLATFORM' : 'RESTAURANT',
      role: user.role,
      settings: {},
    };

  // 1. Fetch user's personal preferences
  const userSettings = await prisma.setting.findMany({
    where: { scope: 'USER', userId: user.id },
  });
  const userMap = {};
  userSettings.forEach((s) => {
    userMap[s.key] = s.value;
  });
  result.settings.user = {
    ...DEFAULT_SETTINGS.USER.user_preferences,
    ...(userMap.user_preferences || {}),
  };

  // 2. Fetch Super Admin Platform settings
  if (user.role === 'RESTAURANT_REGISTRATION_ADMIN') {
    const platformSettings = await prisma.setting.findMany({
      where: { scope: 'PLATFORM' },
    });
    const platformMap = {};
    platformSettings.forEach((s) => {
      platformMap[s.key] = s.value;
    });

    result.settings.platform = {
      platform_general: {
        ...DEFAULT_SETTINGS.PLATFORM.platform_general,
        ...(platformMap.platform_general || {}),
      },
      platform_system: {
        ...DEFAULT_SETTINGS.PLATFORM.platform_system,
        ...(platformMap.platform_system || {}),
      },
    };
    return result;
  }

  // 3. For Restaurant Staff (Owner, Chef, Waiter, Receptionist)
  if (!user.restaurantId) {
    return result;
  }

  const [restaurant, restSettings] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    }),
    prisma.setting.findMany({
      where: { scope: 'RESTAURANT', restaurantId: user.restaurantId },
    }),
  ]);

  const restMap = {};
  restSettings.forEach((s) => {
    restMap[s.key] = s.value;
  });

  result.restaurant = restaurant;
  result.settings.restaurant = {
    profile: {
      name: restaurant?.name || '',
      address: restaurant?.address || '',
      phone: restaurant?.phone || '',
      email: restaurant?.email || '',
      currency: restaurant?.currency || 'USD',
      taxRate: restaurant?.taxRate ? Number(restaurant.taxRate) : 5,
    },
    operations: {
      ...DEFAULT_SETTINGS.RESTAURANT.restaurant_operations,
      ...(restMap.restaurant_operations || {}),
    },
    kitchen: {
      ...DEFAULT_SETTINGS.RESTAURANT.restaurant_kitchen,
      ...(restMap.restaurant_kitchen || {}),
    },
    billing: {
      ...DEFAULT_SETTINGS.RESTAURANT.restaurant_billing,
      ...(restMap.restaurant_billing || {}),
    },
    inventory: {
      ...DEFAULT_SETTINGS.RESTAURANT.restaurant_inventory,
      ...(restMap.restaurant_inventory || {}),
    },
  };

    return result;
  });
};

/**
 * Update or insert a setting value
 */
export const updateSetting = async (user, { scope, key, value }) => {
  if (!scope || !key || value === undefined) {
    const error = new Error('Scope, key, and value are required');
    error.statusCode = 400;
    throw error;
  }

  let identifier;
  let restaurantId = null;
  let userId = null;

  // Authorize scope per role
  if (scope === 'PLATFORM') {
    if (user.role !== 'RESTAURANT_REGISTRATION_ADMIN') {
      const error = new Error('Only Super Admin can update platform settings');
      error.statusCode = 403;
      throw error;
    }
    identifier = 'SYSTEM';
  } else if (scope === 'RESTAURANT') {
    if (user.role !== 'RESTAURANT_OWNER') {
      const error = new Error('Only Restaurant Owner can update restaurant operational settings');
      error.statusCode = 403;
      throw error;
    }
    if (!user.restaurantId) {
      const error = new Error('No restaurant associated with this user account');
      error.statusCode = 404;
      throw error;
    }
    identifier = user.restaurantId;
    restaurantId = user.restaurantId;

    // Special handling if updating restaurant_profile: sync to Restaurant model
    if (key === 'restaurant_profile') {
      const profileData = {};
      if (value.name) profileData.name = value.name.trim();
      if (value.address !== undefined) profileData.address = value.address;
      if (value.phone !== undefined) profileData.phone = value.phone;
      if (value.email !== undefined) profileData.email = value.email;
      if (value.currency) profileData.currency = normalizeCurrencyCode(value.currency);
      if (value.taxRate !== undefined) profileData.taxRate = Number(value.taxRate);

      await prisma.restaurant.update({
        where: { id: user.restaurantId },
        data: profileData,
      });
    }
  } else if (scope === 'USER') {
    identifier = user.id;
    userId = user.id;
    if (user.restaurantId) {
      restaurantId = user.restaurantId;
    }
  } else {
    const error = new Error(`Invalid settings scope: ${scope}`);
    error.statusCode = 400;
    throw error;
  }

  const scopeKey = buildScopeKey(scope, identifier, key);

  const updatedSetting = await prisma.setting.upsert({
    where: { scopeKey },
    create: {
      scopeKey,
      scope,
      restaurantId,
      userId,
      key,
      value,
    },
    update: {
      value,
    },
  });

  await invalidateSettingsCache(restaurantId);
  if (key === 'restaurant_inventory' && restaurantId) {
    await invalidateInventoryCache(restaurantId);
  }
  return updatedSetting;
};

export const getRestaurantInventoryPolicy = async (restaurantId) => {
  if (!restaurantId) return DEFAULT_SETTINGS.RESTAURANT.restaurant_inventory;
  const scopeKey = buildScopeKey('RESTAURANT', restaurantId, 'restaurant_inventory');
  const setting = await prisma.setting.findUnique({ where: { scopeKey } });
  return {
    ...DEFAULT_SETTINGS.RESTAURANT.restaurant_inventory,
    ...(setting?.value || {}),
  };
};

export const getEffectiveThreshold = (item, defaultThreshold = 5) => {
  const def = Number(defaultThreshold) > 0 ? Number(defaultThreshold) : 5;
  const rawMin = item?.minStockThreshold !== undefined && item?.minStockThreshold !== null
    ? Number(item.minStockThreshold)
    : (item?.minSafeLevel !== undefined && item?.minSafeLevel !== null ? Number(item.minSafeLevel) : null);

  if (rawMin === null || rawMin === undefined || rawMin === 5) {
    return def;
  }
  return rawMin;
};

export default {
  DEFAULT_SETTINGS,
  getSettingsForUser,
  updateSetting,
  getRestaurantInventoryPolicy,
  getEffectiveThreshold,
};
