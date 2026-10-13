
import { Router } from 'express';
import { validateQuery } from '../middleware/validation.middleware.js';
import { validateUuidParams } from '../validations/resource.validation.js';
import * as billingController from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateGenerateBill } from '../validations/billing.validation.js';
import { validateBillUpdate } from '../validations/resource.validation.js';
import { sendError } from '../utils/response.js';

const router = Router();
validateUuidParams(router);

const authorizeBillGeneration = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return sendError(res, 401, 'User unauthenticated', { code: 'UNAUTHENTICATED' });
  }
  if (![ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER].includes(req.user.role)) {
    return sendError(res, 403, 'You are not authorized to generate bills.', {
      code: 'FORBIDDEN',
      userRole: req.user.role,
      requiredRoles: [ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER],
    });
  }
  next();
};

router.use(authenticate);
router.use(validateQuery);

router.get('/pending-orders', authorizeRoles(ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getPendingOrders);
router.get('/order/:orderId', authorizeRoles(ROLES.WAITER, ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getBillByOrderId);
router.get('/bills', authorizeRoles(ROLES.WAITER, ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getBills);
router.get('/bills/:id', authorizeRoles(ROLES.WAITER, ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getBillById);
router.get('/', authorizeRoles(ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getBills);
router.get('/:id', authorizeRoles(ROLES.WAITER, ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), billingController.getBillById);
router.post('/generate', authorizeBillGeneration, validateRequest(validateGenerateBill), billingController.createBill);
router.post('/bills', authorizeBillGeneration, validateRequest(validateGenerateBill), billingController.createBill);
router.post('/', authorizeBillGeneration, validateRequest(validateGenerateBill), billingController.createBill);
router.patch('/bills/:id/deliver', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), billingController.deliverBill);
router.post('/bills/:id/deliver', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), billingController.deliverBill);
router.patch('/bills/:id', authorizeRoles(ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), validateRequest(validateBillUpdate), billingController.updateBill);
router.patch('/:id/deliver', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), billingController.deliverBill);
router.post('/:id/deliver', authorizeRoles(ROLES.WAITER, ROLES.RESTAURANT_OWNER), billingController.deliverBill);
router.patch('/:id', authorizeRoles(ROLES.RECEPTIONIST, ROLES.RESTAURANT_OWNER), validateRequest(validateBillUpdate), billingController.updateBill);

export default router;
