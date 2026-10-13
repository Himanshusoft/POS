/**
 * Unified Navigation, Role Normalization & Route Mapping for POS
 */

export const ROLES = {
  RESTAURANT_REGISTRATION_ADMIN: 'RESTAURANT_REGISTRATION_ADMIN',
  RESTAURANT_OWNER: 'RESTAURANT_OWNER',
  KITCHEN_ADMIN: 'KITCHEN_ADMIN',
  WAITER: 'WAITER',
  RECEPTIONIST: 'RECEPTIONIST',
};

/**
 * Normalizes any role input (including legacy or external alias names) into one
 * of the 5 canonical roles.
 */
export const normalizeRole = (rawRole) => {
  let roleStr = rawRole;
  if (rawRole && typeof rawRole === 'object') {
    roleStr = rawRole.role || rawRole.name || (Array.isArray(rawRole) ? rawRole[0] : null);
  }
  if (!roleStr || typeof roleStr !== 'string') return 'GUEST';
  const r = roleStr.trim().toUpperCase();

  // Super Admin / Governance
  if (
    r === 'RESTAURANT_REGISTRATION_ADMIN' ||
    r === 'PLATFORM_SUPER_ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'REGISTRATION_ADMIN'
  ) {
    return ROLES.RESTAURANT_REGISTRATION_ADMIN;
  }

  // Restaurant Owner / Admin
  if (
    r === 'RESTAURANT_OWNER' ||
    r === 'RESTAURANT_ADMIN' ||
    r === 'OWNER' ||
    r === 'ADMIN'
  ) {
    return ROLES.RESTAURANT_OWNER;
  }

  // Kitchen Admin / Chef
  if (
    r === 'KITCHEN_ADMIN' ||
    r === 'CHEF' ||
    r === 'KITCHEN' ||
    r === 'KITCHEN_STAFF'
  ) {
    return ROLES.KITCHEN_ADMIN;
  }

  // Waiter / Service Waiter
  if (
    r === 'WAITER' ||
    r === 'SERVICE_WAITER' ||
    r === 'SERVER'
  ) {
    return ROLES.WAITER;
  }

  // Receptionist / Cashier
  if (
    r === 'RECEPTIONIST' ||
    r === 'CASHIER' ||
    r === 'FRONT_DESK' ||
    r === 'BILLING_ADMIN'
  ) {
    return ROLES.RECEPTIONIST;
  }

  return r;
};

/**
 * Role Definitions, UI Badges & Navigation Permissions
 */
export const ROLE_CONFIG = {
  [ROLES.RESTAURANT_REGISTRATION_ADMIN]: {
    name: 'Platform Super Admin',
    badge: 'SUPER ADMIN',
    color: 'bg-[#92400E]/10 text-[#92400E] border-[#92400E]/25',
    defaultTab: 'registration',
    defaultPath: '/super-admin-dashboard',
    allowedTabs: ['registration', 'dashboard', 'settings'],
  },
  [ROLES.RESTAURANT_OWNER]: {
    name: 'Restaurant Admin',
    badge: 'OWNER',
    color: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    defaultTab: 'dashboard',
    defaultPath: '/restaurant-dashboard',
    allowedTabs: [
      'dashboard',
      'staff',
      'menu',
      'tables',
      'floor',
      'pos',
      'kds',
      'inventory',
      'purchases',
      'billing',
      'reports',
      'settings',
    ],
  },
  [ROLES.KITCHEN_ADMIN]: {
    name: 'Kitchen Admin',
    badge: 'CHEF',
    color: 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/25',
    defaultTab: 'dashboard',
    defaultPath: '/kitchen-dashboard',
    allowedTabs: ['dashboard', 'orders', 'inventory', 'recipes', 'settings'],
  },
  [ROLES.WAITER]: {
    name: 'Service Waiter',
    badge: 'WAITER',
    color: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    defaultTab: 'dashboard',
    defaultPath: '/waiter-dashboard',
    allowedTabs: ['dashboard', 'tables', 'orders', 'menu', 'pos', 'settings'],
  },
  [ROLES.RECEPTIONIST]: {
    name: 'Reception / Cashier',
    badge: 'CASHIER',
    color: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    defaultTab: 'dashboard',
    defaultPath: '/receptionist-dashboard',
    allowedTabs: ['dashboard', 'billing', 'floor', 'pos', 'settings'],
  },
};

/**
 * Route-to-Tab mapping with aliases
 */
const ROUTE_MAP = {
  // Role Dashboard specific URLs
  '/waiter-dashboard': { tab: 'dashboard', role: ROLES.WAITER },
  '/waiter': { tab: 'dashboard', role: ROLES.WAITER },
  '/kitchen-dashboard': { tab: 'dashboard', role: ROLES.KITCHEN_ADMIN },
  '/kitchen': { tab: 'dashboard', role: ROLES.KITCHEN_ADMIN },
  '/restaurant-dashboard': { tab: 'dashboard', role: ROLES.RESTAURANT_OWNER },
  '/receptionist-dashboard': { tab: 'dashboard', role: ROLES.RECEPTIONIST },
  '/reception': { tab: 'dashboard', role: ROLES.RECEPTIONIST },
  '/super-admin-dashboard': { tab: 'registration', role: ROLES.RESTAURANT_REGISTRATION_ADMIN },
  '/governance': { tab: 'registration', role: ROLES.RESTAURANT_REGISTRATION_ADMIN },
  '/admin': { tab: 'registration', role: ROLES.RESTAURANT_REGISTRATION_ADMIN },

  // Generic direct tabs
  '/dashboard': { tab: 'dashboard' },
  '/tables': { tab: 'tables' },
  '/orders': { tab: 'orders' },
  '/menu': { tab: 'menu' },
  '/pos': { tab: 'pos' },
  '/floor': { tab: 'floor' },
  '/billing': { tab: 'billing' },
  '/kds': { tab: 'kds' },
  '/inventory': { tab: 'inventory' },
  '/recipes': { tab: 'recipes' },
  '/purchases': { tab: 'purchases' },
  '/reports': { tab: 'reports' },
  '/staff': { tab: 'staff' },
  '/settings': { tab: 'settings' },
  '/profile': { tab: 'settings', subTab: 'profile' },
};

/**
 * Returns the default authorized dashboard path for a given role.
 */
export const getDefaultPathForRole = (rawRole) => {
  const normalizedRole = normalizeRole(rawRole);
  const roleCfg = ROLE_CONFIG[normalizedRole];
  return roleCfg?.defaultPath || '/dashboard';
};

/**
 * Returns the default authorized tab for a given role.
 */
export const getDefaultTabForRole = (rawRole) => {
  const normalizedRole = normalizeRole(rawRole);
  const roleCfg = ROLE_CONFIG[normalizedRole];
  return roleCfg?.defaultTab || 'dashboard';
};

/**
 * Resolves browser pathname and authenticated role to a safe, valid tab & path.
 * Guaranteed to NEVER return an undefined tab or crash.
 */
export const resolveRoute = (pathname, rawRole, options = {}) => {
  const normalizedRole = normalizeRole(rawRole);
  const roleCfg = ROLE_CONFIG[normalizedRole];

  // Default fallback if role is unknown or not ready
  if (!roleCfg) {
    return {
      tab: 'dashboard',
      path: '/dashboard',
      subTab: 'profile',
      isAuthorized: true,
    };
  }

  // If this is an explicit login transition, directly map to authorized default
  if (options && options.isLoginTransition) {
    return {
      tab: roleCfg.defaultTab,
      path: roleCfg.defaultPath,
      subTab: 'profile',
      isAuthorized: true,
    };
  }

  // Clean pathname: strip trailing slash and queries
  const cleanPath = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';

  // Root or generic login path maps to role's default dashboard
  if (cleanPath === '/' || cleanPath === '/login') {
    return {
      tab: roleCfg.defaultTab,
      path: roleCfg.defaultPath,
      subTab: 'profile',
      isAuthorized: true,
    };
  }

  // Check known route mapping
  const route = ROUTE_MAP[cleanPath];
  if (route) {
    // If route specifies a specific role requirement
    if (route.role && route.role !== normalizedRole) {
      // Role mismatch -> redirect to current role's own default dashboard
      return {
        tab: roleCfg.defaultTab,
        path: roleCfg.defaultPath,
        subTab: 'profile',
        isAuthorized: false,
        warning: `The requested path (${cleanPath}) is not authorized for your role. Redirected to your workspace.`,
      };
    }

    // Verify role is permitted for this tab
    if (roleCfg.allowedTabs.includes(route.tab)) {
      return {
        tab: route.tab,
        path: cleanPath,
        subTab: route.subTab || 'profile',
        isAuthorized: true,
      };
    }

    // Tab not allowed for role
    return {
      tab: roleCfg.defaultTab,
      path: roleCfg.defaultPath,
      subTab: 'profile',
      isAuthorized: false,
      warning: `Access restricted for that station. Redirected to your default dashboard.`,
    };
  }

  // Unknown path -> redirect to role default
  return {
    tab: roleCfg.defaultTab,
    path: roleCfg.defaultPath,
    subTab: 'profile',
    isAuthorized: true,
  };
};

/**
 * Returns canonical browser URL path for a given tab and role.
 */
export const getPathForTab = (tab, rawRole) => {
  const normalizedRole = normalizeRole(rawRole);
  const roleCfg = ROLE_CONFIG[normalizedRole];

  if (!roleCfg) return `/${tab}`;

  if (tab === roleCfg.defaultTab) {
    return roleCfg.defaultPath;
  }

  return `/${tab}`;
};
