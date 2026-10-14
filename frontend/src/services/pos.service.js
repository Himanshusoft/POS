import api from './api';

export const posService = {
  // Auth
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout', {}),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/password', data),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resendResetOtp: (email) => api.post('/auth/resend-reset-otp', { email }),
    verifyResetOtp: (email, otp) => api.post('/auth/verify-reset-otp', { email, otp }),
    resetPassword: (resetToken, newPassword) => api.post('/auth/reset-password', { resetToken, newPassword }),
  },

  // Tables
  tables: {
    getAll: () => api.get('/tables'),
    getById: (id) => api.get(`/tables/${id}`),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.put(`/tables/${id}`, data),
    updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
    delete: (id) => api.delete(`/tables/${id}`),
  },

  // Menu
  menu: {
    getCategories: () => api.get('/menu/categories'),
    createCategory: (data) => api.post('/menu/categories', data),
    updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/menu/categories/${id}`),

    getItems: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/menu/items${q ? `?${q}` : ''}`);
    },
    getItemById: (id) => api.get(`/menu/items/${id}`),
    createItem: (data) => api.post('/menu/items', data),
    updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
    deleteItem: (id) => api.delete(`/menu/items/${id}`),
    toggleAvailability: (id, isAvailable) => api.patch(`/menu/items/${id}/availability`, { isAvailable }),
    uploadImage: (file) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post('/menu/upload', formData);
    },
  },

  // Recipes (BOM)
  recipes: {
    getAll: () => api.get('/recipes'),
    getByMenuItem: (menuItemId) => api.get(`/recipes/menu-item/${menuItemId}`),
    create: (data) => api.post('/recipes', data),
    update: (id, data) => api.put(`/recipes/${id}`, data),
    delete: (id) => api.delete(`/recipes/${id}`),
  },

  // Orders
  orders: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/orders${q ? `?${q}` : ''}`);
    },
    getById: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
    cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
    addItem: (id, item) => api.post(`/orders/${id}/items`, item),
    addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
    removeItem: (id, itemId) => api.delete(`/orders/${id}/items/${itemId}`),
    markServed: (id) => api.patch(`/orders/${id}/served`),
    sendToKitchen: (id) => api.post(`/orders/${id}/send-to-kitchen`),
    requestBill: (id) => api.post(`/orders/${id}/request-bill`),
    cancelBillRequest: (id) => api.post(`/orders/${id}/cancel-bill-request`),
    validateCart: (items) => api.post('/orders/validate-cart', { items }),
  },

  // Waiter Operations
  waiter: {
    getDashboard: () => api.get('/waiter/dashboard'),
    deliverBill: (id) => api.patch(`/billing/bills/${id}/deliver`),
    sendToKitchen: (orderId) => api.post(`/orders/${orderId}/send-to-kitchen`),
    serveOrder: (orderId) => api.patch(`/orders/${orderId}/served`),
    requestBill: (orderId) => api.post(`/orders/${orderId}/request-bill`),
    cancelBillRequest: (orderId) => api.post(`/orders/${orderId}/cancel-bill-request`),
  },

  // Kitchen Operations
  kitchen: {
    getDashboard: () => api.get('/kitchen/dashboard'),
    getOrders: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/kitchen/orders${q ? `?${q}` : ''}`);
    },
    getOrderById: (id) => api.get(`/kitchen/orders/${id}`),
    getPendingOrders: () => api.get('/kitchen/orders/pending'),
    acceptOrder: (id) => api.patch(`/kitchen/orders/${id}/accept`),
    startPreparation: (id) => api.patch(`/kitchen/orders/${id}/prepare`),
    prepareOrder: (id) => api.patch(`/kitchen/orders/${id}/prepare`),
    markReady: (id) => api.patch(`/kitchen/orders/${id}/ready`),
    markServed: (id) => api.patch(`/kitchen/orders/${id}/served`),
    completeOrder: (id) => api.patch(`/kitchen/orders/${id}/complete`),
    cancelOrder: (id) => api.patch(`/kitchen/orders/${id}/cancel`),
    updateStatus: (id, status) => api.patch(`/kitchen/orders/${id}/status`, { status }),
    getInventory: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/kitchen/inventory${q ? `?${q}` : ''}`);
    },
    getRecipes: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/kitchen/recipes${q ? `?${q}` : ''}`);
    },
  },

  // Billing
  billing: {
    getPendingOrders: () => api.get('/billing/pending-orders'),
    getBills: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/billing/bills${q ? `?${q}` : ''}`);
    },
    getBillById: (id) => api.get(`/billing/bills/${id}`),
    generateBill: (data) => api.post('/billing/generate', data),
  },

  // Payments
  payments: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/payments${q ? `?${q}` : ''}`);
    },
    getById: (id) => api.get(`/payments/${id}`),
    processPayment: (data) => api.post('/payments', data),
    createRazorpayOrder: (data) => api.post('/payments/razorpay/order', data),
    createRazorpayQrCode: (data) => api.post('/payments/razorpay/qr', data),
    verifyRazorpayPayment: (data) => api.post('/payments/razorpay/verify', data),
  },

  // Inventory
  inventory: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/inventory${q ? `?${q}` : ''}`);
    },
    getById: (id) => api.get(`/inventory/${id}`),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    adjustStock: (id, data) => api.patch(`/inventory/${id}/adjust`, data),
    delete: (id) => api.delete(`/inventory/${id}`),
    getTransactions: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/inventory/transactions${q ? `?${q}` : ''}`);
    },
    getLowStockAlerts: () => api.get('/inventory/low-stock'),
  },

  // Suppliers
  suppliers: {
    getAll: () => api.get('/suppliers'),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  // Purchases
  purchases: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/purchases${q ? `?${q}` : ''}`);
    },
    getById: (id) => api.get(`/purchases/${id}`),
    create: (data) => api.post('/purchases', data),
    receive: (id) => api.patch(`/purchases/${id}/receive`),
    cancel: (id) => api.patch(`/purchases/${id}/cancel`),
    updateStatus: (id, status) => api.patch(`/purchases/${id}/status`, { status }),
  },

  // Wastage
  wastage: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/wastage${q ? `?${q}` : ''}`);
    },
    log: (data) => api.post('/wastage', data),
  },

  // Reports
  reports: {
    getDashboard: () => api.get('/reports/dashboard'),
    getSales: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/reports/sales${q ? `?${q}` : ''}`);
    },
    getInventory: () => api.get('/reports/inventory'),
    getWastage: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/reports/wastage${q ? `?${q}` : ''}`);
    },
    getFinancials: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/reports/financials${q ? `?${q}` : ''}`);
    },
  },

  // Staff / Users
  users: {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    toggleStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
    delete: (id) => api.delete(`/users/${id}`),
  },

  // Restaurant Profile & Configuration
  restaurant: {
    getDetails: () => api.get('/restaurants'),
    update: (id, data) => api.patch(`/restaurants/${id}`, data),
  },

  // Dynamic Settings (Platform, Restaurant, User Scopes)
  settings: {
    get: () => api.get('/settings'),
    update: (scope, key, value) => api.put(`/settings/${scope}/${key}`, { value }),
  },

  // Level 1: Platform Super Admin / Registration Administration
  registrationAdmin: {
    getOverview: () => api.get('/super-admin/overview'),
    getAnalytics: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/super-admin/analytics${q ? `?${q}` : ''}`);
    },
    getRestaurants: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/super-admin/restaurants${q ? `?${q}` : ''}`);
    },
    getRestaurantById: (id) => api.get(`/super-admin/restaurants/${id}`),
    onboardRestaurant: (data) => api.post('/super-admin/restaurants', data),
    updateStatus: (id, isActive) => api.patch(`/super-admin/restaurants/${id}/status`, { isActive }),
    updateSubscription: (id, data) => api.patch(`/super-admin/restaurants/${id}/subscription`, data),
    resetOwnerCredentials: (id, data) => api.post(`/super-admin/restaurants/${id}/owner`, data),
    getPlans: () => api.get('/super-admin/plans'),
    createPlan: (data) => api.post('/super-admin/plans', data),
    updatePlan: (id, data) => api.put(`/super-admin/plans/${id}`, data),
    updatePlanStatus: (id, isActive) => api.patch(`/super-admin/plans/${id}/status`, { isActive }),
  },
};

// Convenient alias for Super Admin platform management
posService.superAdmin = posService.registrationAdmin;

export default posService;
