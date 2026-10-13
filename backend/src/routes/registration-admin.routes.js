import { Router } from 'express';
import * as adminController from '../controllers/registration-admin.controller.js';
import * as planController from '../controllers/plan.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';

const router = Router();

// Only Level 1 Platform Super Admin (RESTAURANT_REGISTRATION_ADMIN) can access
router.use(authenticate);
router.use(authorizeRoles(ROLES.RESTAURANT_REGISTRATION_ADMIN));

// Platform Overview Stats & Consolidated Analytics
router.get('/overview', adminController.getPlatformOverview);
router.get('/analytics', adminController.getPlatformAnalytics);

// Platform Plans Management
router.get('/plans', planController.getPlans);
router.post('/plans', planController.createPlan);
router.get('/plans/:id', planController.getPlanById);
router.put('/plans/:id', planController.updatePlan);
router.patch('/plans/:id/status', planController.updatePlanStatus);

// Tenant Restaurants & Governance
router.post('/restaurants', adminController.onboardRestaurant);
router.get('/restaurants', adminController.getRestaurants);
router.get('/restaurants/:id', adminController.getRestaurantById);
router.patch('/restaurants/:id/status', adminController.updateRestaurantStatus);
router.patch('/restaurants/:id/subscription', adminController.updateRestaurantSubscription);
router.post('/restaurants/:id/owner', adminController.resetOwnerCredentials);

export default router;
