import { Router } from 'express';
import { validateQuery } from '../middleware/validation.middleware.js';
import { validateUuidParams } from '../validations/resource.validation.js';
import * as orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateCreateOrder } from '../validations/order.validation.js';
import { validateOrderUpdate } from '../validations/resource.validation.js';

const router = Router();
validateUuidParams(router);

router.use(authenticate);
router.use(validateQuery);

router.get('/active', orderController.getActiveOrders);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.post('/validate-cart', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER, ROLES.RECEPTIONIST), orderController.validateCart);
router.post('/', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER, ROLES.RECEPTIONIST), validateRequest(validateCreateOrder), orderController.createOrder);
router.post('/:id/items', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.addItemsToOrder);
router.post('/:id/request-bill', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.requestBill);
router.post('/:id/cancel-bill-request', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER, ROLES.RECEPTIONIST), orderController.cancelBillRequest);
router.post('/:id/send-to-kitchen', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.sendToKitchen);
router.patch('/:id/served', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.markServed);
router.post('/:id/serve', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.markServed);
router.patch('/:id/status', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.updateOrderStatus);
router.patch('/:id/cancel', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), orderController.cancelOrder);
router.patch('/:id', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), validateRequest(validateOrderUpdate), orderController.updateOrder);

export default router;
