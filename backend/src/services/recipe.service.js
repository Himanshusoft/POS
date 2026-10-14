import { prisma } from '../config/env.js';
import { findManyPaginated } from '../utils/pagination.js';
import { areUnitsCompatible } from '../utils/unitConversion.js';
import { invalidateRecipeCache, invalidateMenuCache, cachedQuery, buildCacheKey } from '../utils/cache.js';

export const createOrUpdateRecipe = async (restaurantId, data) => {
  const menuItem = await prisma.menuItem.findFirst({
    where: { id: data.menuItemId, restaurantId },
  });
  if (!menuItem) {
    const error = new Error('Menu item not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }

  // Validate all referenced inventory items belong to this restaurant
  if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
    const inventoryIds = data.ingredients.map((i) => i.inventoryItemId);
    const existingInventoryItems = await prisma.inventoryItem.findMany({
      where: { id: { in: inventoryIds }, restaurantId },
      select: { id: true, unit: true },
    });
    if (existingInventoryItems.length !== inventoryIds.length) {
      const error = new Error('One or more recipe ingredients reference invalid inventory items for this restaurant');
      error.statusCode = 400;
      throw error;
    }
    const unitById = new Map(existingInventoryItems.map((item) => [item.id, item.unit]));
    if (data.ingredients.some((ingredient) => !areUnitsCompatible(ingredient.unit, unitById.get(ingredient.inventoryItemId)))) {
      const error = new Error('Recipe ingredient unit is incompatible with its inventory item unit');
      error.statusCode = 422;
      throw error;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let recipe = await tx.recipe.findUnique({
      where: { menuItemId: data.menuItemId },
    });

    if (!recipe) {
      recipe = await tx.recipe.create({
        data: {
          menuItemId: data.menuItemId,
          instructions: data.instructions || null,
          prepTime: data.prepTime !== undefined ? Number(data.prepTime) : null,
        },
      });
    } else {
      recipe = await tx.recipe.update({
        where: { id: recipe.id },
        data: {
          instructions: data.instructions !== undefined ? data.instructions : recipe.instructions,
          prepTime: data.prepTime !== undefined ? Number(data.prepTime) : recipe.prepTime,
        },
      });
      // Replace all ingredients
      await tx.recipeIngredient.deleteMany({
        where: { recipeId: recipe.id },
      });
    }

    if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
      await tx.recipeIngredient.createMany({
        data: data.ingredients.map((ing) => ({
          recipeId: recipe.id,
          inventoryItemId: ing.inventoryItemId,
          quantityRequired: Number(ing.quantityRequired),
          unit: ing.unit,
        })),
      });
    }

    return await tx.recipe.findUnique({
      where: { id: recipe.id },
      include: {
        menuItem: true,
        ingredients: {
          include: { inventoryItem: true },
        },
      },
    });
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return result;
};

export const createRecipe = async (restaurantId, data) => {
  return await createOrUpdateRecipe(restaurantId, data);
};

export const getRecipes = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'recipes:list', filters);
  return await cachedQuery(cacheKey, 30, async () => {
    return await findManyPaginated(prisma.recipe, {
      where: { menuItem: { restaurantId } },
      include: {
        menuItem: true,
        ingredients: { include: { inventoryItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    }, filters);
  });
};

export const getRecipeByMenuItem = async (restaurantId, menuItemId) => {
  const cacheKey = buildCacheKey(restaurantId, 'recipes', { menuItemId });
  return await cachedQuery(cacheKey, 60, async () => {
    const recipe = await prisma.recipe.findFirst({
      where: {
        menuItemId,
        menuItem: { restaurantId },
      },
      include: {
        menuItem: true,
        ingredients: {
          include: { inventoryItem: true },
        },
      },
    });

    if (!recipe) {
      const error = new Error('Recipe not found for this menu item');
      error.statusCode = 404;
      throw error;
    }
    return recipe;
  });
};

export const getRecipeById = async (restaurantId, id) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id, menuItem: { restaurantId } },
    include: {
      menuItem: true,
      ingredients: {
        include: { inventoryItem: true },
      },
    },
  });
  if (!recipe) {
    const error = new Error('Recipe not found');
    error.statusCode = 404;
    throw error;
  }
  return recipe;
};

export const updateRecipe = async (restaurantId, id, data) => {
  await getRecipeById(restaurantId, id);

  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      instructions: data.instructions !== undefined ? data.instructions : undefined,
      prepTime: data.prepTime !== undefined ? Number(data.prepTime) : undefined,
    },
    include: {
      menuItem: true,
      ingredients: { include: { inventoryItem: true } },
    },
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return updated;
};

export const deleteRecipe = async (restaurantId, id) => {
  await getRecipeById(restaurantId, id);
  const deleted = await prisma.recipe.delete({
    where: { id },
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return deleted;
};

export const addRecipeIngredient = async (restaurantId, recipeId, data) => {
  await getRecipeById(restaurantId, recipeId);

  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { id: data.inventoryItemId, restaurantId },
    select: { id: true, unit: true },
  });
  if (!inventoryItem) {
    const error = new Error('Inventory item not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }
  if (!areUnitsCompatible(data.unit, inventoryItem.unit)) {
    const error = new Error('Recipe ingredient unit is incompatible with its inventory item unit');
    error.statusCode = 422;
    throw error;
  }

  const existing = await prisma.recipeIngredient.findUnique({
    where: {
      recipeId_inventoryItemId: {
        recipeId,
        inventoryItemId: data.inventoryItemId,
      },
    },
  });
  if (existing) {
    const error = new Error('This ingredient is already in the recipe. Update its quantity instead.');
    error.statusCode = 409;
    throw error;
  }

  const created = await prisma.recipeIngredient.create({
    data: {
      recipeId,
      inventoryItemId: data.inventoryItemId,
      quantityRequired: Number(data.quantityRequired),
      unit: data.unit,
    },
    include: { inventoryItem: true },
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return created;
};

export const updateRecipeIngredient = async (restaurantId, ingredientId, data) => {
  const ingredient = await prisma.recipeIngredient.findFirst({
    where: { id: ingredientId, recipe: { menuItem: { restaurantId } } },
    include: { inventoryItem: { select: { unit: true } } },
  });
  if (!ingredient) {
    const error = new Error('Recipe ingredient not found');
    error.statusCode = 404;
    throw error;
  }
  if (data.unit !== undefined && !areUnitsCompatible(data.unit, ingredient.inventoryItem.unit)) {
    const error = new Error('Recipe ingredient unit is incompatible with its inventory item unit');
    error.statusCode = 422;
    throw error;
  }

  const updated = await prisma.recipeIngredient.update({
    where: { id: ingredientId },
    data: {
      quantityRequired: data.quantityRequired !== undefined ? Number(data.quantityRequired) : undefined,
      unit: data.unit || undefined,
    },
    include: { inventoryItem: true },
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return updated;
};

export const removeRecipeIngredient = async (restaurantId, ingredientId) => {
  const ingredient = await prisma.recipeIngredient.findFirst({
    where: { id: ingredientId, recipe: { menuItem: { restaurantId } } },
  });
  if (!ingredient) {
    const error = new Error('Recipe ingredient not found');
    error.statusCode = 404;
    throw error;
  }

  const deleted = await prisma.recipeIngredient.delete({
    where: { id: ingredientId },
  });

  await Promise.all([
    invalidateRecipeCache(restaurantId),
    invalidateMenuCache(restaurantId),
  ]);

  return deleted;
};

export default {
  createOrUpdateRecipe,
  createRecipe,
  getRecipes,
  getRecipeByMenuItem,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  addRecipeIngredient,
  updateRecipeIngredient,
  removeRecipeIngredient,
};
