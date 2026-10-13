import { convertQuantity, areUnitsCompatible } from './unitConversion';

/**
 * Evaluates the real-time orderable inventory availability for a menu item.
 * Uses backend-provided inventoryAvailability metadata if present, or calculates
 * directly from item.recipe.ingredients if necessary.
 *
 * @param {Object} item Menu item
 * @param {number} [requestedQty=1]
 * @returns {Object} Availability info
 */
export const getItemAvailability = (item, requestedQty = 1) => {
  if (!item) {
    return {
      isOrderable: false,
      maxOrderableQuantity: 0,
      reasonCode: 'NOT_FOUND',
      reasonTitle: 'Item Not Found',
      reasonMessage: 'Menu item details not found.',
      missingIngredients: [],
    };
  }

  // If item is manually marked 86/unavailable
  if (item.isAvailable === false) {
    return {
      isOrderable: false,
      maxOrderableQuantity: 0,
      reasonCode: 'MANUALLY_UNAVAILABLE',
      reasonTitle: 'Unavailable',
      reasonMessage: `Menu item '${item.name}' is currently unavailable.`,
      missingIngredients: [],
    };
  }

  // Use backend evaluation if already attached and requestedQty === 1
  if (item.inventoryAvailability && requestedQty === 1) {
    return item.inventoryAvailability;
  }

  const recipe = item.recipe;

  // CASE 1: Recipe not configured
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return {
      isOrderable: false,
      maxOrderableQuantity: 0,
      reasonCode: 'NO_RECIPE',
      reasonTitle: 'Inventory unavailable',
      reasonMessage: 'Recipe ingredients are not configured for this item.',
      missingIngredients: [],
    };
  }

  const missingIngredients = [];
  let minPortions = Infinity;

  // CASE 2, 3, 5: Check each ingredient
  for (const ing of recipe.ingredients) {
    const inv = ing.inventoryItem;
    const reqAmount = Number(ing.quantityRequired);

    if (!inv) {
      missingIngredients.push({
        ingredient: ing.name || 'Required ingredient',
        required: reqAmount * requestedQty,
        available: 0,
        unit: ing.unit,
        reason: 'NOT_FOUND',
      });
      minPortions = 0;
      continue;
    }

    if (!areUnitsCompatible(ing.unit, inv.unit)) {
      missingIngredients.push({
        ingredient: inv.name,
        required: reqAmount,
        available: Number(inv.currentStock),
        unit: inv.unit,
        reason: 'INCOMPATIBLE_UNIT',
      });
      minPortions = 0;
      continue;
    }

    let reqPerDishInInvUnit = 0;
    try {
      reqPerDishInInvUnit = convertQuantity(reqAmount, ing.unit, inv.unit);
    } catch {
      reqPerDishInInvUnit = reqAmount;
    }

    const currentStock = Number(inv.currentStock) || 0;
    const totalReq = Number((reqPerDishInInvUnit * requestedQty).toFixed(4));
    const portions = reqPerDishInInvUnit > 0 ? Math.floor(currentStock / reqPerDishInInvUnit) : 0;

    if (portions < minPortions) {
      minPortions = portions;
    }

    if (currentStock < totalReq) {
      missingIngredients.push({
        ingredient: inv.name,
        required: totalReq,
        available: currentStock,
        unit: inv.unit,
        reason: 'INSUFFICIENT_STOCK',
      });
    }
  }

  const maxOrderableQuantity = Number.isFinite(minPortions) ? Math.max(0, minPortions) : 0;

  if (missingIngredients.length > 0) {
    const first = missingIngredients[0];
    let reasonCode = first.reason === 'NOT_FOUND' ? 'MISSING_INGREDIENT' : 'INSUFFICIENT_STOCK';
    let reasonTitle = 'Insufficient Inventory';
    let reasonMessage = '';

    if (first.reason === 'NOT_FOUND') {
      reasonMessage = `${first.ingredient} is not available in inventory.`;
    } else if (requestedQty === 1) {
      if (missingIngredients.length === 1) {
        reasonMessage = `${first.ingredient} requires ${first.required.toFixed(2)} ${first.unit}, but only ${first.available.toFixed(2)} ${first.unit} is available.`;
      } else {
        const details = missingIngredients
          .map((m) => `• ${m.ingredient} — Required ${m.required.toFixed(2)} ${m.unit} | Available ${m.available.toFixed(2)} ${m.unit}`)
          .join('\n');
        reasonMessage = `${item.name} cannot be prepared with current stock.\nMissing ingredients:\n${details}`;
      }
    } else {
      if (missingIngredients.length === 1) {
        reasonMessage = `Insufficient Inventory for ${requestedQty} units: ${first.ingredient} required: ${first.required.toFixed(2)} ${first.unit}, Available: ${first.available.toFixed(2)} ${first.unit}.`;
      } else {
        const details = missingIngredients
          .map((m) => `• ${m.ingredient} — Required ${m.required.toFixed(2)} ${m.unit} | Available ${m.available.toFixed(2)} ${m.unit}`)
          .join('\n');
        reasonMessage = `Insufficient Inventory for ${requestedQty} units of ${item.name}.\nMissing ingredients:\n${details}`;
      }
    }

    return {
      isOrderable: false,
      maxOrderableQuantity,
      reasonCode,
      reasonTitle,
      reasonMessage,
      missingIngredients,
    };
  }

  return {
    isOrderable: true,
    maxOrderableQuantity,
    reasonCode: 'AVAILABLE',
    reasonTitle: 'Available',
    reasonMessage: 'Sufficient stock available.',
    missingIngredients: [],
  };
};

/**
 * Validates whether proposed cart quantities can be fulfilled by cumulative inventory stock.
 *
 * @param {Array<{ menuItemId: string, quantity: number }>} cart
 * @param {Array<Object>} menuItems All available menu items
 * @returns {{ isValid: boolean, errorTitle?: string, errorMessage?: string, missingItems?: Array }}
 */
export const validateCumulativeCartInventory = (cart, menuItems) => {
  if (!cart || cart.length === 0) return { isValid: true };

  const itemMap = new Map((menuItems || []).map((m) => [m.id, m]));
  const ingredientDemands = new Map();

  for (const cartItem of cart) {
    const menuItem = itemMap.get(cartItem.menuItemId);
    if (!menuItem) continue;

    const recipe = menuItem.recipe;
    if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return {
        isValid: false,
        errorTitle: 'Inventory unavailable',
        errorMessage: `Recipe ingredients are not configured for '${menuItem.name}'.`,
        missingItems: [],
      };
    }

    const qty = Number(cartItem.quantity) || 1;

    for (const ing of recipe.ingredients) {
      const inv = ing.inventoryItem;
      if (!inv) {
        return {
          isValid: false,
          errorTitle: 'Insufficient Inventory',
          errorMessage: `${ing.name || 'Required ingredient'} is not available in inventory.`,
          missingItems: [{ ingredient: ing.name || 'Unknown', required: Number(ing.quantityRequired) * qty, available: 0, unit: ing.unit }],
        };
      }

      let reqInInvUnit = 0;
      try {
        reqInInvUnit = convertQuantity(Number(ing.quantityRequired) * qty, ing.unit, inv.unit);
      } catch {
        reqInInvUnit = Number(ing.quantityRequired) * qty;
      }

      const existing = ingredientDemands.get(inv.id) || {
        invItem: inv,
        totalRequired: 0,
        dishes: [],
      };

      existing.totalRequired = Number((existing.totalRequired + reqInInvUnit).toFixed(4));
      existing.dishes.push(`${qty}x ${menuItem.name}`);
      ingredientDemands.set(inv.id, existing);
    }
  }

  const missingList = [];
  for (const [, entry] of ingredientDemands.entries()) {
    const currentStock = Number(entry.invItem.currentStock) || 0;
    if (currentStock < entry.totalRequired) {
      missingList.push({
        ingredient: entry.invItem.name,
        required: entry.totalRequired,
        available: currentStock,
        unit: entry.invItem.unit,
        dishes: entry.dishes,
      });
    }
  }

  if (missingList.length > 0) {
    const first = missingList[0];
    const errorMessage = missingList.length === 1
      ? `${first.ingredient} required: ${first.required.toFixed(2)} ${first.unit}, Available: ${first.available.toFixed(2)} ${first.unit}.`
      : `Multiple ingredients insufficient:\n` + missingList.map(m => `• ${m.ingredient} — Required ${m.required.toFixed(2)} ${m.unit} | Available ${m.available.toFixed(2)} ${m.unit}`).join('\n');

    return {
      isValid: false,
      errorTitle: 'Insufficient Inventory',
      errorMessage: `Inventory is not sufficient for your ticket selection.\n${errorMessage}`,
      missingItems: missingList,
    };
  }

  return { isValid: true };
};

export default {
  getItemAvailability,
  validateCumulativeCartInventory,
};
