/**
 * Subscription Lifecycle Utilities & DTO Formatter
 *
 * Provides authoritative lifecycle state evaluation, remaining days calculation,
 * expiration status, and standardized subscription DTO mapping.
 */

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  UPCOMING: 'UPCOMING',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
};

export const EXPIRING_SOON_THRESHOLD_DAYS = 7;

/**
 * Calculates deterministic subscription lifecycle status, days remaining,
 * and expiration state.
 *
 * @param {Object|null} subscription - Prisma subscription object or date container
 * @param {Date} [referenceDate=new Date()] - Reference timestamp for time arithmetic
 * @returns {Object} Calculated lifecycle metrics
 */
export const calculateSubscriptionLifecycle = (subscription, referenceDate = new Date()) => {
  if (!subscription) {
    return {
      status: SUBSCRIPTION_STATUSES.NO_SUBSCRIPTION,
      rawStatus: null,
      daysRemaining: 0,
      totalDays: 0,
      progressPercentage: 100,
      isExpiringSoon: false,
      isExpired: true,
      isSuspended: false,
      isActive: false,
      startDate: null,
      endDate: null,
    };
  }

  const rawStatus = (subscription.status || 'ACTIVE').toUpperCase();
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (rawStatus === 'SUSPENDED') {
    const end = subscription.endDate ? new Date(subscription.endDate) : null;
    const daysRemaining =
      end && !isNaN(end.getTime())
        ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    return {
      status: SUBSCRIPTION_STATUSES.SUSPENDED,
      rawStatus,
      daysRemaining,
      totalDays: 0,
      progressPercentage: 100,
      isExpiringSoon: false,
      isExpired: daysRemaining === 0,
      isSuspended: true,
      isActive: false,
      startDate: subscription.startDate ? new Date(subscription.startDate) : null,
      endDate: end,
    };
  }

  const start = subscription.startDate ? new Date(subscription.startDate) : null;
  const end = subscription.endDate ? new Date(subscription.endDate) : null;

  // If start is in the future
  if (start && !isNaN(start.getTime()) && start.getTime() > now.getTime()) {
    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays =
      end && !isNaN(end.getTime())
        ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      status: SUBSCRIPTION_STATUSES.UPCOMING,
      rawStatus,
      daysRemaining: durationDays,
      totalDays: durationDays,
      progressPercentage: 0,
      isExpiringSoon: false,
      isExpired: false,
      isSuspended: false,
      isActive: false,
      startDate: start,
      endDate: end,
      daysUntilStart,
    };
  }

  // If no endDate specified or invalid
  if (!end || isNaN(end.getTime())) {
    return {
      status: rawStatus === 'EXPIRED' ? SUBSCRIPTION_STATUSES.EXPIRED : SUBSCRIPTION_STATUSES.ACTIVE,
      rawStatus,
      daysRemaining: 0,
      totalDays: 0,
      progressPercentage: 0,
      isExpiringSoon: false,
      isExpired: rawStatus === 'EXPIRED',
      isSuspended: false,
      isActive: rawStatus !== 'EXPIRED',
      startDate: start,
      endDate: null,
    };
  }

  const diffTime = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let totalDays = 0;
  let progressPercentage = 100;
  if (start && !isNaN(start.getTime()) && end.getTime() > start.getTime()) {
    totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    progressPercentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
  }

  // Evaluation: Is it expired?
  if (diffTime <= 0 || rawStatus === 'EXPIRED') {
    return {
      status: SUBSCRIPTION_STATUSES.EXPIRED,
      rawStatus,
      daysRemaining: 0,
      totalDays,
      progressPercentage: 100,
      isExpiringSoon: false,
      isExpired: true,
      isSuspended: false,
      isActive: false,
      startDate: start,
      endDate: end,
    };
  }

  // Expiring soon if within threshold
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS;

  return {
    status: isExpiringSoon ? SUBSCRIPTION_STATUSES.EXPIRING_SOON : SUBSCRIPTION_STATUSES.ACTIVE,
    rawStatus,
    daysRemaining,
    totalDays,
    progressPercentage,
    isExpiringSoon,
    isExpired: false,
    isSuspended: false,
    isActive: true,
    startDate: start,
    endDate: end,
  };
};

/**
 * Standardized DTO serializer for Restaurant with Subscription
 *
 * @param {Object} restaurant - Restaurant entity with included users and subscription
 * @returns {Object} Formatted subscription DTO
 */
export const formatSubscriptionDTO = (restaurant) => {
  if (!restaurant) return null;

  const subscription = restaurant.subscription || null;
  const lifecycle = calculateSubscriptionLifecycle(subscription);

  // Identify owner user if present
  const users = Array.isArray(restaurant.users) ? restaurant.users : [];
  const owner =
    users.find((u) => u.role === 'RESTAURANT_OWNER') ||
    users.find((u) => u.role === 'RESTAURANT_ADMIN' || u.role === 'OWNER') ||
    users[0] ||
    null;

  const plan = subscription?.plan || null;

  return {
    id: subscription?.id || `sub_${restaurant.id}`,
    subscriptionId: subscription?.id || null,
    restaurantId: restaurant.id,
    organizationId: restaurant.id,
    organizationName: restaurant.name || 'Unnamed Establishment',
    ownerName: owner?.name || 'Unassigned',
    ownerEmail: owner?.email || '',
    ownerPhone: owner?.phone || restaurant.phone || '',
    planId: subscription?.planId || plan?.id || null,
    planName: plan?.name || 'No Active Plan',
    planPrice: plan?.price !== undefined && plan?.price !== null ? Number(plan.price) : 0,
    status: lifecycle.status,
    rawStatus: lifecycle.rawStatus || 'NONE',
    daysRemaining: lifecycle.daysRemaining,
    totalDays: lifecycle.totalDays,
    progressPercentage: lifecycle.progressPercentage,
    isExpiringSoon: lifecycle.isExpiringSoon,
    isExpired: lifecycle.isExpired,
    isSuspended: lifecycle.isSuspended,
    isActive: lifecycle.isActive,
    startDate: lifecycle.startDate ? lifecycle.startDate.toISOString() : null,
    endDate: lifecycle.endDate ? lifecycle.endDate.toISOString() : null,
    createdAt: subscription?.createdAt
      ? new Date(subscription.createdAt).toISOString()
      : restaurant.createdAt
      ? new Date(restaurant.createdAt).toISOString()
      : null,
    updatedAt: subscription?.updatedAt
      ? new Date(subscription.updatedAt).toISOString()
      : restaurant.updatedAt
      ? new Date(restaurant.updatedAt).toISOString()
      : null,
    organization: {
      id: restaurant.id,
      name: restaurant.name,
      currency: restaurant.currency || '₹',
      isActive: restaurant.isActive,
      taxRate: restaurant.taxRate !== undefined ? Number(restaurant.taxRate) : 5,
      address: restaurant.address || null,
      phone: restaurant.phone || null,
      email: restaurant.email || null,
    },
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: Number(plan.price || 0),
          durationDays: plan.durationDays,
          maxStaff: plan.maxStaff,
          maxWaiters: plan.maxWaiters,
          maxKitchenAdmins: plan.maxKitchenAdmins,
          maxReceptionists: plan.maxReceptionists,
          maxTables: plan.maxTables,
          maxMenuItems: plan.maxMenuItems,
          features: plan.features || [],
        }
      : null,
  };
};

export default {
  SUBSCRIPTION_STATUSES,
  EXPIRING_SOON_THRESHOLD_DAYS,
  calculateSubscriptionLifecycle,
  formatSubscriptionDTO,
};
