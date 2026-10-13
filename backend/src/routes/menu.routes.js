import { Router } from 'express';
import { validateQuery } from '../middleware/validation.middleware.js';
import * as menuController from '../controllers/menu.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { uploadMenuImage } from '../middleware/upload.middleware.js';
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateCreateMenuItem,
  validateUpdateMenuItem,
} from '../validations/menu.validation.js';
import { validateAvailability, validateUuidParams } from '../validations/resource.validation.js';

const router = Router();
validateUuidParams(router);

router.use(authenticate);
router.use(validateQuery);

// Categories
router.get('/categories', menuController.getCategories);
router.get('/categories/:id', menuController.getCategoryById);
router.post('/categories', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest(validateCreateCategory), menuController.createCategory);
router.patch('/categories/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest(validateUpdateCategory), menuController.updateCategory);
router.put('/categories/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest(validateUpdateCategory), menuController.updateCategory);
router.delete('/categories/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), menuController.deleteCategory);

// Standalone Image Upload
router.post('/upload', authorizeRoles(ROLES.RESTAURANT_OWNER), uploadMenuImage('image'), menuController.uploadMenuItemImage);
router.post('/items/upload', authorizeRoles(ROLES.RESTAURANT_OWNER), uploadMenuImage('image'), menuController.uploadMenuItemImage);

// Menu Items
router.get('/items', menuController.getMenuItems);
router.get('/items/:id', menuController.getMenuItemById);
router.post('/items', authorizeRoles(ROLES.RESTAURANT_OWNER), uploadMenuImage('image'), validateRequest(validateCreateMenuItem), menuController.createMenuItem);
router.patch('/items/:id/availability', authorizeRoles(ROLES.RESTAURANT_OWNER, ROLES.KITCHEN_ADMIN), validateRequest(validateAvailability), menuController.updateMenuItemAvailability);
router.patch('/items/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), uploadMenuImage('image'), validateRequest(validateUpdateMenuItem), menuController.updateMenuItem);
router.put('/items/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), uploadMenuImage('image'), validateRequest(validateUpdateMenuItem), menuController.updateMenuItem);
router.delete('/items/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), menuController.deleteMenuItem);

export default router;
