/**
 * Centralized Query Key Factory for TanStack React Query.
 * All keys are strictly scoped by restaurantId / tenant scope and parameters
 * to eliminate cross-tenant leakage and provide deterministic cache invalidation.
 */

export const queryKeys = {
  // Authentication & Session
  auth: {
    me: () => ['auth', 'me'],
  },

  // Tables
  tables: {
    all: (restaurantId) => ['tables', 'list', restaurantId || 'current'],
    detail: (restaurantId, id) => ['tables', 'detail', restaurantId || 'current', id],
  },

  // Menu Categories & Items
  menu: {
    categories: (restaurantId) => ['menu', 'categories', restaurantId || 'current'],
    items: (restaurantId, params = {}) => ['menu', 'items', restaurantId || 'current', params],
    itemDetail: (restaurantId, id) => ['menu', 'item', restaurantId || 'current', id],
  },

  // Recipes / BOM
  recipes: {
    all: (restaurantId) => ['recipes', 'list', restaurantId || 'current'],
    byMenuItem: (restaurantId, menuItemId) => ['recipes', 'menuItem', restaurantId || 'current', menuItemId],
  },

  // Orders
  orders: {
    all: (restaurantId, params = {}) => ['orders', 'list', restaurantId || 'current', params],
    detail: (restaurantId, id) => ['orders', 'detail', restaurantId || 'current', id],
  },

  // Waiter Operations
  waiter: {
    dashboard: (restaurantId) => ['waiter', 'dashboard', restaurantId || 'current'],
  },

  // Kitchen Operations
  kitchen: {
    dashboard: (restaurantId) => ['kitchen', 'dashboard', restaurantId || 'current'],
    orders: (restaurantId, params = {}) => ['kitchen', 'orders', restaurantId || 'current', params],
    pendingOrders: (restaurantId) => ['kitchen', 'pending-orders', restaurantId || 'current'],
    inventory: (restaurantId, params = {}) => ['kitchen', 'inventory', restaurantId || 'current', params],
    recipes: (restaurantId, params = {}) => ['kitchen', 'recipes', restaurantId || 'current', params],
  },

  // Billing
  billing: {
    pendingOrders: (restaurantId) => ['billing', 'pending-orders', restaurantId || 'current'],
    bills: (restaurantId, params = {}) => ['billing', 'bills', restaurantId || 'current', params],
    detail: (restaurantId, id) => ['billing', 'detail', restaurantId || 'current', id],
  },

  // Payments
  payments: {
    all: (restaurantId, params = {}) => ['payments', 'list', restaurantId || 'current', params],
    detail: (restaurantId, id) => ['payments', 'detail', restaurantId || 'current', id],
  },

  // Inventory
  inventory: {
    all: (restaurantId, params = {}) => ['inventory', 'list', restaurantId || 'current', params],
    detail: (restaurantId, id) => ['inventory', 'detail', restaurantId || 'current', id],
    transactions: (restaurantId, params = {}) => ['inventory', 'transactions', restaurantId || 'current', params],
    lowStock: (restaurantId) => ['inventory', 'low-stock', restaurantId || 'current'],
  },

  // Suppliers & Purchases
  suppliers: {
    all: (restaurantId) => ['suppliers', 'list', restaurantId || 'current'],
  },
  purchases: {
    all: (restaurantId, params = {}) => ['purchases', 'list', restaurantId || 'current', params],
  },
  wastage: {
    all: (restaurantId, params = {}) => ['wastage', 'list', restaurantId || 'current', params],
  },

  // Analytics & Reports
  reports: {
    dashboard: (restaurantId) => ['reports', 'dashboard', restaurantId || 'current'],
    sales: (restaurantId, params = {}) => ['reports', 'sales', restaurantId || 'current', params],
    inventory: (restaurantId) => ['reports', 'inventory', restaurantId || 'current'],
    wastage: (restaurantId, params = {}) => ['reports', 'wastage', restaurantId || 'current', params],
    financials: (restaurantId, params = {}) => ['reports', 'financials', restaurantId || 'current', params],
  },

  // Staff / Users
  users: {
    all: (restaurantId) => ['users', 'list', restaurantId || 'current'],
    detail: (restaurantId, id) => ['users', 'detail', restaurantId || 'current', id],
  },

  // Dynamic Settings
  settings: {
    all: (restaurantId) => ['settings', 'list', restaurantId || 'current'],
  },

  // Super Admin Platform
  superAdmin: {
    overview: () => ['superAdmin', 'overview'],
    analytics: (params = {}) => ['superAdmin', 'analytics', params],
    restaurants: (params = {}) => ['superAdmin', 'restaurants', params],
    restaurantDetail: (id) => ['superAdmin', 'restaurant', id],
    plans: () => ['superAdmin', 'plans'],
    planDetail: (id) => ['superAdmin', 'plan', id],
    subscriptions: (params = {}) => ['superAdmin', 'subscriptions', params],
    subscriptionsOverview: () => ['superAdmin', 'subscriptions', 'overview'],
    subscriptionDetail: (restaurantId) => ['superAdmin', 'subscription', restaurantId],
  },
};

export default queryKeys;
