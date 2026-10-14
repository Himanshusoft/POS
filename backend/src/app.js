import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/error.middleware.js';
import { requestProfiler } from './middleware/profiler.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Modular REST Route Imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import tableRoutes from './routes/table.routes.js';
import menuRoutes from './routes/menu.routes.js';
import recipeRoutes from './routes/recipe.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import orderRoutes from './routes/order.routes.js';
import kitchenRoutes from './routes/kitchen.routes.js';
import waiterRoutes from './routes/waiter.routes.js';
import billingRoutes from './routes/billing.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import wastageRoutes from './routes/wastage.routes.js';
import reportRoutes from './routes/report.routes.js';
import registrationAdminRoutes from './routes/registration-admin.routes.js';
import planRoutes from './routes/plan.routes.js';
import settingRoutes from './routes/setting.routes.js';

const app = express();

// Global Middlewares
app.use(requestProfiler);
app.use(cors({
  origin: true,
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Restaurant POS API is running',
  });
});

// Primary REST API Routes (/api/...)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wastage', wastageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/registration-admin', registrationAdminRoutes);
app.use('/api/super-admin', registrationAdminRoutes);
app.use('/api/settings', settingRoutes);

// Compatibility Mounts (/api/v1/...)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/recipes', recipeRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/waiter', waiterRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/wastages', wastageRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/registration-admin', registrationAdminRoutes);
app.use('/api/v1/super-admin', registrationAdminRoutes);
app.use('/api/v1/settings', settingRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    error: {
      code: 'NOT_FOUND',
      path: req.originalUrl,
      method: req.method,
    },
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
