import { convertQuantity, areUnitsCompatible } from '../utils/unitConversion.js';

/**
 * Evaluates the real-time orderable inventory availability for a single menu item.
 * 
 * Returns structured metadata:
 * - isOrderable: boolean (true only if recipe configured + all ingredients exist in inventory + sufficient stock)
 * - maxOrderableQuantity: number (maximum whole portions that can be prepared with current stock)
 * - reasonCode: 'AVAILABLE' | 'NO_RECIPE' | 'MISSING_INGREDIENT' | 'INCOMPATIBLE_UNIT' | 'INSUFFICIENT_STOCK' | 'MANUALLY_UNAVAILABLE'
 * - reasonTitle: string ('Available' | 'Inventory unavailable' | 'Insufficient Inventory')
 * - reasonMessage: string (clear user-facing reason explaining why or why not orderable)
 * - missingIngredients: array of { ingredient, required, available, unit }
 * - ingredientsSummary: array of ingredients with required per dish, available stock, unit, and portions
 *
 * @param {Object} menuItem Menu item object with optional recipe.ingredients.inventoryItem
 * @param {number} [requestedQuantity=1]
 * @param {Map<string, Object>} [inventoryMap=null] Optional fresh inventory lookup map
 * @returns {Object} Availability evaluation result
 */
export const evaluateMenuItemAvailability = (menuItem, requestedQuantity = 1, inventoryMap = null) => {
  const reqQty = Math.max(1, Number(requestedQuantity) || 1);

  // Check manual 86 / availability flag
  if (menuItem.isAvailable === false) {
    return {
      isOrderable: false,
      maxOrderableQuantity: 0,
      reasonCode: 'MANUALLY_UNAVAILABLE',
      reasonTitle: 'Unavailable',
      reasonMessage: `Menu item '${menuItem.name}' is currently unavailable.`,
      missingIngredients: [],
      ingredientsSummary: [],
    };
  }

  const recipe = menuItem.recipe;

  // CASE 1: Recipe not configured
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return {
      isOrderable: false,
      maxOrderableQuantity: 0,
      reasonCode: 'NO_RECIPE',
      reasonTitle: 'Inventory unavailable',
      reasonMessage: 'Recipe ingredients are not configured for this item.',
      missingIngredients: [],
      ingredientsSummary: [],
    };
  }

  const missingIngredients = [];
  const ingredientsSummary = [];
  let minPortionsAcrossIngredients = Infinity;

  // CASE 2, 3, 4, 5: Validate each required ingredient
  for (const recipeIngredient of recipe.ingredients) {
    const invItemId = recipeIngredient.inventoryItemId;
    const invItem = inventoryMap?.get(invItemId) || recipeIngredient.inventoryItem;

    // CASE 2: Ingredient does not exist in inventory
    if (!invItem) {
      const missingIngName = recipeIngredient.name || 'Required ingredient';
      const requiredRaw = Number(recipeIngredient.quantityRequired) * reqQty;
      missingIngredients.push({
        ingredient: missingIngName,
        required: Number(requiredRaw.toFixed(4)),
        available: 0,
        unit: recipeIngredient.unit,
        reason: 'NOT_FOUND',
      });
      minPortionsAcrossIngredients = 0;
      continue;
    }

    // Incompatible unit check
    if (!areUnitsCompatible(recipeIngredient.unit, invItem.unit)) {
      missingIngredients.push({
        ingredient: invItem.name,
        required: Number(recipeIngredient.quantityRequired),
        available: Number(invItem.currentStock),
        unit: invItem.unit,
        reason: 'INCOMPATIBLE_UNIT',
      });
      minPortionsAcrossIngredients = 0;
      continue;
    }

    let requiredPerDishInInvUnit = 0;
    try {
      requiredPerDishInInvUnit = convertQuantity(
        Number(recipeIngredient.quantityRequired),
        recipeIngredient.unit,
        invItem.unit
      );
    } catch {
      requiredPerDishInInvUnit = Number(recipeIngredient.quantityRequired);
    }

    const currentStock = Number(invItem.currentStock) || 0;
    const totalRequiredForReqQty = Number((requiredPerDishInInvUnit * reqQty).toFixed(4));
    const portionsForThisIngredient = requiredPerDishInInvUnit > 0
      ? Math.max(0, Math.floor(currentStock / requiredPerDishInInvUnit))
      : 0;

    if (portionsForThisIngredient < minPortionsAcrossIngredients) {
      minPortionsAcrossIngredients = portionsForThisIngredient;
    }

    const isSufficient = currentStock >= totalRequiredForReqQty;

    ingredientsSummary.push({
      inventoryItemId: invItem.id,
      ingredientName: invItem.name,
      requiredPerDish: requiredPerDishInInvUnit,
      totalRequired: totalRequiredForReqQty,
      availableStock: currentStock,
      unit: invItem.unit,
      isSufficient,
      portionsAvailable: portionsForThisIngredient,
    });

    // CASE 3 & 5: Insufficient stock for requested quantity
    if (!isSufficient) {
      missingIngredients.push({
        ingredient: invItem.name,
        required: totalRequiredForReqQty,
        available: currentStock,
        unit: invItem.unit,
        reason: 'INSUFFICIENT_STOCK',
      });
    }
  }

  const maxOrderableQuantity = Number.isFinite(minPortionsAcrossIngredients)
    ? Math.max(0, minPortionsAcrossIngredients)
    : 0;

  // Determine overall status and user-facing messages
  if (missingIngredients.length > 0) {
    const firstMissing = missingIngredients[0];
    let reasonCode = firstMissing.reason === 'NOT_FOUND' ? 'MISSING_INGREDIENT' : 'INSUFFICIENT_STOCK';
    let reasonTitle = 'Insufficient Inventory';
    let reasonMessage = '';

    if (firstMissing.reason === 'NOT_FOUND') {
      reasonMessage = `${firstMissing.ingredient} is not available in inventory.`;
    } else if (reqQty === 1) {
      if (missingIngredients.length === 1) {
        reasonMessage = `${firstMissing.ingredient} requires ${firstMissing.required.toFixed(2)} ${firstMissing.unit}, but only ${firstMissing.available.toFixed(2)} ${firstMissing.unit} is available.`;
      } else {
        const ingDetails = missingIngredients
          .map((m) => `• ${m.ingredient} — Required ${m.required.toFixed(2)} ${m.unit} | Available ${m.available.toFixed(2)} ${m.unit}`)
          .join('\n');
        reasonMessage = `${menuItem.name} cannot be prepared with current stock.\nMissing ingredients:\n${ingDetails}`;
      }
    } else {
      // Multi-quantity failure
      if (missingIngredients.length === 1) {
        reasonMessage = `Insufficient Inventory for ${reqQty} units: ${firstMissing.ingredient} required: ${firstMissing.required.toFixed(2)} ${firstMissing.unit}, Available: ${firstMissing.available.toFixed(2)} ${firstMissing.unit}.`;
      } else {
        const ingDetails = missingIngredients
          .map((m) => `• ${m.ingredient} — Required ${m.required.toFixed(2)} ${m.unit} | Available ${m.available.toFixed(2)} ${m.unit}`)
          .join('\n');
        reasonMessage = `Insufficient Inventory for ${reqQty} units of ${menuItem.name}.\nMissing ingredients:\n${ingDetails}`;
      }
    }

    return {
      isOrderable: false,
      maxOrderableQuantity,
      reasonCode,
      reasonTitle,
      reasonMessage,
      missingIngredients,
      ingredientsSummary,
    };
  }

  return {
    isOrderable: true,
    maxOrderableQuantity,
    reasonCode: 'AVAILABLE',
    reasonTitle: 'Available',
    reasonMessage: 'Sufficient inventory available.',
    missingIngredients: [],
    ingredientsSummary,
  };
};

/**
 * Authoritative backend validation for order placement or adding items to an existing order.
 * Executes inside a Prisma transaction to ensure latest database stock is checked atomically.
 *
 * Checks:
 * 1. Menu item exists in restaurant.
 * 2. Menu item is active (isAvailable === true).
 * 3. Recipe exists and has configured ingredients.
 * 4. Required inventory items exist.
 * 5. Cumulative stock across all items in the requested order is sufficient.
 *
 * Throws structured error with code 'INSUFFICIENT_INVENTORY' if validation fails.
 *
 * @param {Object} tx Prisma client transaction
 * @param {string} restaurantId
 * @param {Array<{ menuItemId: string, quantity: number }>} items
 */
export const validateOrderInventory = async (tx, restaurantId, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Order items must be a non-empty array');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch all referenced menu items with their recipes and recipe ingredients
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await tx.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId },
    include: {
      recipe: {
        include: {
          ingredients: {
            include: { inventoryItem: true },
          },
        },
      },
    },
  });

  if (menuItems.length !== menuItemIds.length) {
    const error = new Error('One or more menu items are invalid or not found');
    error.statusCode = 400;
    throw error;
  }

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // 2. Validate menu item status & recipe configuration for each item
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    const quantity = Number(item.quantity) || 1;

    if (quantity <= 0) {
      const error = new Error(`Item quantity for '${menuItem?.name}' must be greater than zero`);
      error.statusCode = 400;
      throw error;
    }

    if (!menuItem.isAvailable) {
      const error = new Error(`Menu item '${menuItem.name}' is currently unavailable`);
      error.statusCode = 400;
      throw error;
    }

    // CASE 1: Recipe not configured
    const recipe = menuItem.recipe;
    if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      const error = new Error(`Recipe ingredients are not configured for '${menuItem.name}'`);
      error.statusCode = 400;
      error.code = 'INSUFFICIENT_INVENTORY';
      error.items = [];
      error.errors = [`Recipe ingredients are not configured for '${menuItem.name}'`];
      throw error;
    }
  }

  // 3. Aggregate cumulative ingredient demand across all ordered items
  const inventoryDeductions = new Map();

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    const quantity = Number(item.quantity) || 1;
    const recipe = menuItem.recipe;

    for (const recipeIngredient of recipe.ingredients) {
      const invItemId = recipeIngredient.inventoryItemId;
      const invItem = recipeIngredient.inventoryItem;

      // CASE 2: Ingredient not found in inventory
      if (!invItem) {
        const error = new Error(`${recipeIngredient.name || 'Required ingredient'} is not available in inventory.`);
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_INVENTORY';
        error.items = [
          {
            ingredient: recipeIngredient.name || 'Unknown',
            required: Number(recipeIngredient.quantityRequired) * quantity,
            available: 0,
            unit: recipeIngredient.unit,
          },
        ];
        error.errors = [`Ingredient is not available in inventory for '${menuItem.name}'`];
        throw error;
      }

      if (!areUnitsCompatible(recipeIngredient.unit, invItem.unit)) {
        const error = new Error(`Recipe ingredient unit '${recipeIngredient.unit}' is incompatible with inventory unit '${invItem.unit}' for '${invItem.name}'`);
        error.statusCode = 422;
        error.code = 'INSUFFICIENT_INVENTORY';
        throw error;
      }

      const requiredInRecipeUnit = Number(recipeIngredient.quantityRequired) * quantity;
      const requiredInInvUnit = convertQuantity(requiredInRecipeUnit, recipeIngredient.unit, invItem.unit);

      const existing = inventoryDeductions.get(invItemId) || {
        inventoryItemId: invItemId,
        name: invItem.name,
        unit: invItem.unit,
        totalRequired: 0,
        dishes: [],
      };

      existing.totalRequired = Number((existing.totalRequired + requiredInInvUnit).toFixed(4));
      existing.dishes.push(`${quantity}x ${menuItem.name}`);
      inventoryDeductions.set(invItemId, existing);
    }
  }

  // 4. Check freshest current stock in database for all required inventory items
  const insufficientItems = [];

  for (const [invId, entry] of inventoryDeductions.entries()) {
    const freshInv = await tx.inventoryItem.findFirst({
      where: { id: invId, restaurantId },
    });

    if (!freshInv) {
      insufficientItems.push({
        ingredient: entry.name,
        required: entry.totalRequired,
        available: 0,
        unit: entry.unit,
        dishes: entry.dishes,
      });
      continue;
    }

    const available = Number(freshInv.currentStock);
    const required = entry.totalRequired;

    // CASE 3 & 5: Stock shortage
    if (available < required) {
      insufficientItems.push({
        ingredient: freshInv.name,
        required,
        available: Number(available.toFixed(4)),
        unit: freshInv.unit,
        dishes: entry.dishes,
      });
    }
  }

  // If any ingredient has insufficient inventory, reject order with structured error
  if (insufficientItems.length > 0) {
    const dishDescriptions = Array.from(new Set(insufficientItems.flatMap((i) => i.dishes))).join(', ');
    const mainItemName = dishDescriptions || 'the requested dish';

    const message = insufficientItems.length === 1
      ? `Insufficient inventory to prepare ${mainItemName}`
      : `Insufficient inventory to prepare ${mainItemName}`;

    const error = new Error(message);
    error.statusCode = 400;
    error.code = 'INSUFFICIENT_INVENTORY';
    error.items = insufficientItems.map((i) => ({
      ingredient: i.ingredient,
      required: i.required,
      available: i.available,
      unit: i.unit,
    }));
    error.errors = insufficientItems.map(
      (i) => `${i.ingredient} requires ${i.required} ${i.unit}, but only ${i.available} ${i.unit} is available.`
    );
    throw error;
  }

  return true;
};

export default {
  evaluateMenuItemAvailability,
  validateOrderInventory,
};
