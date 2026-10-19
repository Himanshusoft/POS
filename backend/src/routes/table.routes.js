import { Router } from 'express';
import { validateQuery } from '../middleware/validation.middleware.js';
import * as tableController from '../controllers/table.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateTable, validateTableStatus, validateUuidParams } from '../validations/resource.validation.js';

const router = Router();
validateUuidParams(router);

router.use(authenticate);
router.use(validateQuery);

router.get('/', tableController.getTables);
router.get('/:id', tableController.getTableById);
router.post('/', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest((data) => validateTable(data)), tableController.createTable);
router.patch('/:id/status', authorizeRoles(ROLES.WAITER), validateRequest(validateTableStatus), tableController.updateTableStatus);
router.patch('/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest((data) => validateTable(data, true)), tableController.updateTable);
router.put('/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), validateRequest((data) => validateTable(data, true)), tableController.updateTable);
router.delete('/:id', authorizeRoles(ROLES.RESTAURANT_OWNER), tableController.deleteTable);

export default router;
