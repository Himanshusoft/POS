import { Router } from 'express';
import { validateQuery } from '../middleware/validation.middleware.js';
import { validateUuidParams } from '../validations/resource.validation.js';
import * as recipeController from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, ROLES } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { validateRecipeSetup, validateAddIngredient } from '../validations/recipe.validation.js';
import { validateRecipeIngredientUpdate, validateRecipeUpdate } from '../validations/resource.validation.js';

const router = Router();
validateUuidParams(router);

router.use(authenticate);
router.use(validateQuery);

// Recipe read endpoints - Accessible to both Restaurant Admin and Kitchen Admin
router.get('/menu-item/:menuItemId', authorizeRoles(ROLES.RESTAURANT_OWNER, ROLES.KITCHEN_ADMIN), recipeController.getRecipeByMenuItem);
router.get('/:id', authorizeRoles(ROLES.RESTAURANT_OWNER, ROLES.KITCHEN_ADMIN), recipeController.getRecipeById);
router.get('/', authorizeRoles(ROLES.RESTAURANT_OWNER, ROLES.KITCHEN_ADMIN), recipeController.getRecipes);

// Recipe mutation endpoints - Strictly restricted to Kitchen Admin (Restaurant Admin cannot modify recipe definitions or ingredients)
router.post('/', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateRecipeSetup), recipeController.createRecipe);
router.patch('/:id', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateRecipeUpdate), recipeController.updateRecipe);
router.delete('/:id', authorizeRoles(ROLES.KITCHEN_ADMIN), recipeController.deleteRecipe);

// Recipe ingredients sub-resource - Strictly restricted to Kitchen Admin
router.post('/:recipeId/ingredients', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateAddIngredient), recipeController.addRecipeIngredient);
router.post('/:id/ingredients', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateAddIngredient), recipeController.addRecipeIngredient);
router.patch('/:recipeId/ingredients/:ingredientId', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateRecipeIngredientUpdate), recipeController.updateRecipeIngredient);
router.patch('/ingredients/:ingredientId', authorizeRoles(ROLES.KITCHEN_ADMIN), validateRequest(validateRecipeIngredientUpdate), recipeController.updateRecipeIngredient);
router.delete('/:recipeId/ingredients/:ingredientId', authorizeRoles(ROLES.KITCHEN_ADMIN), recipeController.removeRecipeIngredient);
router.delete('/ingredients/:ingredientId', authorizeRoles(ROLES.KITCHEN_ADMIN), recipeController.removeRecipeIngredient);

export default router;
