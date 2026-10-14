import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import posService from '../services/pos.service';
import { queryKeys } from '../config/queryKeys';

// Helper to determine if query should be enabled (defaults to true unless caller explicitly specifies enabled: false)
const isQueryEnabled = (options = {}) => {
  if (options && options.enabled !== undefined) return Boolean(options.enabled);
  return true;
};

// Helper to safely parse polymorphic arguments: (params, options) vs (options)
const parseParamsAndOptions = (params = {}, options = {}) => {
  if (params && (params.enabled !== undefined || params.refetchInterval !== undefined || params.staleTime !== undefined)) {
    return { actualParams: {}, actualOptions: { ...params, ...options } };
  }
  return { actualParams: params || {}, actualOptions: options || {} };
};

// ==========================================
// 1. TABLES HOOKS
// ==========================================

export function useTables(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.tables.all(restaurantId),
    queryFn: async () => {
      const res = await posService.tables.getAll();
      if (res.success && res.data) {
        return Array.isArray(res.data) ? res.data : (res.data.items || []);
      }
      return [];
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: isQueryEnabled(options),
    ...options,
  });
}

// ==========================================
// 2. MENU HOOKS
// ==========================================

export function useMenuCategories(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.menu.categories(restaurantId),
    queryFn: async () => {
      const res = await posService.menu.getCategories();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes reference data
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useMenuItems(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.menu.items(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.menu.getItems(actualParams);
      if (res.success && res.data) {
        return Array.isArray(res.data) ? res.data : (res.data.items || []);
      }
      return [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 3. RECIPES & INVENTORY HOOKS
// ==========================================

export function useRecipes(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.recipes.all(restaurantId),
    queryFn: async () => {
      const res = await posService.recipes.getAll();
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useInventory(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.inventory.all(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.inventory.getAll(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 4. ORDERS HOOKS
// ==========================================

export function useOrders(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.orders.all(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.orders.getAll(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 15 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 5. WAITER OPERATIONS HOOKS
// ==========================================

export function useWaiterDashboard(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.waiter.dashboard(restaurantId),
    queryFn: async () => {
      const res = await posService.waiter.getDashboard();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 6 * 1000, // 6 seconds fresh
    refetchInterval: 8000, // Safe 8-second polling
    enabled: isQueryEnabled(options),
    ...options,
  });
}

// ==========================================
// 6. KITCHEN OPERATIONS HOOKS
// ==========================================

export function useKitchenDashboard(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.kitchen.dashboard(restaurantId),
    queryFn: async () => {
      const res = await posService.kitchen.getDashboard();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 6 * 1000,
    refetchInterval: 8000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useKitchenOrders(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.kitchen.orders(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.kitchen.getOrders(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 6 * 1000,
    refetchInterval: 8000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 7. BILLING & PAYMENTS HOOKS
// ==========================================

export function usePendingBillingOrders(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.billing.pendingOrders(restaurantId),
    queryFn: async () => {
      const res = await posService.billing.getPendingOrders();
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 6 * 1000,
    refetchInterval: 8000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useBills(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.billing.bills(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.billing.getBills(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 15 * 1000,
    refetchInterval: 8000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

export function usePayments(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.payments.all(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.payments.getAll(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 15 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 8. REPORTS & ANALYTICS HOOKS
// ==========================================

export function useAdminDashboardSummary(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.dashboard(restaurantId),
    queryFn: async () => {
      const res = await posService.reports.getDashboard();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useReportsSales(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.reports.sales(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.reports.getSales(actualParams);
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

export function useReportsInventory(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.inventory(restaurantId),
    queryFn: async () => {
      const res = await posService.reports.getInventory();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

export function useReportsWastage(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.reports.wastage(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.reports.getWastage(actualParams);
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

export function useReportsFinancials(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.reports.financials(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.reports.getFinancials(actualParams);
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

// ==========================================
// 9. PROCUREMENT & SUPPLIERS HOOKS
// ==========================================

export function usePurchases(restaurantId, params = {}, options = {}) {
  const { actualParams, actualOptions } = parseParamsAndOptions(params, options);
  return useQuery({
    queryKey: queryKeys.purchases.all(restaurantId, actualParams),
    queryFn: async () => {
      const res = await posService.purchases.getAll(actualParams);
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 30 * 1000,
    enabled: isQueryEnabled(actualOptions),
    ...actualOptions,
  });
}

export function useSuppliers(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers.all(restaurantId),
    queryFn: async () => {
      const res = await posService.suppliers.getAll();
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 60 * 1000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

// ==========================================
// 10. DYNAMIC SETTINGS HOOKS
// ==========================================

export function useSettings(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.settings.all(restaurantId),
    queryFn: async () => {
      const res = await posService.settings.get();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 60 * 1000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

// ==========================================
// 11. SUPER ADMIN HOOKS
// ==========================================

export function useSuperAdminOverview(options = {}) {
  return useQuery({
    queryKey: queryKeys.superAdmin.overview(),
    queryFn: async () => {
      const res = await posService.superAdmin.getOverview();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useSuperAdminRestaurants(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.superAdmin.restaurants(params),
    queryFn: async () => {
      const res = await posService.superAdmin.getRestaurants(params);
      return res.success && res.data ? res.data : [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useSuperAdminPlans(options = {}) {
  return useQuery({
    queryKey: queryKeys.superAdmin.plans(),
    queryFn: async () => {
      const res = await posService.superAdmin.getPlans();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

// ==========================================
// 12. STAFF / USERS HOOKS
// ==========================================

export function useUsers(restaurantId, options = {}) {
  return useQuery({
    queryKey: queryKeys.users.all(restaurantId),
    queryFn: async () => {
      const res = await posService.users.getAll();
      return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
    },
    staleTime: 60 * 1000,
    enabled: isQueryEnabled(options),
    ...options,
  });
}

// ==========================================
// 13. PRECISE MUTATIONS WITH INVALIDATION
// ==========================================

export function usePosMutations(restaurantId) {
  const queryClient = useQueryClient();

  const invalidateTables = () => {
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['waiter', 'dashboard'] });
  };

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['waiter', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['billing', 'pending-orders'] });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  const invalidateBilling = () => {
    queryClient.invalidateQueries({ queryKey: ['billing'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['waiter', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard'] });
  };

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen', 'dashboard'] });
  };

  const invalidateMenu = () => {
    queryClient.invalidateQueries({ queryKey: ['menu'] });
  };

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const invalidatePurchases = () => {
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  const invalidateSuperAdmin = () => {
    queryClient.invalidateQueries({ queryKey: ['superAdmin'] });
  };

  return {
    invalidateTables,
    invalidateOrders,
    invalidateBilling,
    invalidateInventory,
    invalidateMenu,
    invalidateUsers,
    invalidatePurchases,
    invalidateSettings,
    invalidateSuperAdmin,
  };
}
