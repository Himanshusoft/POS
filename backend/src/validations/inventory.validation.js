export const validateCreateInventory = (data) => {
  const errors = [];
  const validUnits = ['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'PACKET', 'CAN', 'BOTTLE'];
  if (!data?.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Item name is required');
  }
  if (!data?.unit || !validUnits.includes(data.unit)) {
    errors.push(`unit must be one of: ${validUnits.join(', ')}`);
  }
  const currentStock = data?.currentStock !== undefined ? data.currentStock : data?.openingStock;
  if (currentStock !== undefined && currentStock !== null && currentStock !== '') {
    if ((typeof currentStock === 'string' && /[eE]/.test(currentStock)) || !Number.isFinite(Number(currentStock)) || Number(currentStock) < 0) {
      errors.push('currentStock cannot be negative or use scientific notation');
    }
  }
  const minStockThreshold = data?.minStockThreshold !== undefined
    ? data.minStockThreshold
    : (data?.minSafeLevel !== undefined ? data.minSafeLevel : data?.minStockLevel);
  if (minStockThreshold !== undefined && minStockThreshold !== null && minStockThreshold !== '') {
    if ((typeof minStockThreshold === 'string' && /[eE]/.test(minStockThreshold)) || !Number.isFinite(Number(minStockThreshold)) || Number(minStockThreshold) < 0) {
      errors.push('minStockThreshold cannot be negative or use scientific notation');
    }
  }
  const costPerUnit = data?.costPerUnit !== undefined
    ? data.costPerUnit
    : (data?.costPrice !== undefined ? data.costPrice : data?.cost);
  if (costPerUnit !== undefined && costPerUnit !== null && costPerUnit !== '') {
    if ((typeof costPerUnit === 'string' && /[eE]/.test(costPerUnit)) || !Number.isFinite(Number(costPerUnit)) || Number(costPerUnit) < 0) {
      errors.push('costPerUnit cannot be negative or use scientific notation');
    }
  }
  if (data?.sku !== undefined && data.sku !== null && data.sku !== '') {
    if (typeof data.sku !== 'string' || data.sku.trim().length > 50) {
      errors.push('sku must be a string of at most 50 characters');
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const validateStockUpdate = (data) => {
  const errors = [];
  if (data?.currentStock !== undefined) {
    if ((typeof data.currentStock === 'string' && /[eE]/.test(data.currentStock)) || isNaN(Number(data.currentStock)) || Number(data.currentStock) < 0) {
      errors.push('currentStock cannot be negative or use scientific notation');
    }
  }
  if (data?.adjustment !== undefined) {
    if ((typeof data.adjustment === 'string' && /[eE]/.test(data.adjustment)) || isNaN(Number(data.adjustment))) {
      errors.push('adjustment must be a number');
    }
  }
  if (data?.currentStock === undefined && data?.adjustment === undefined) {
    errors.push('Provide either currentStock (set new value) or adjustment (increment/decrement)');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateStockAdjustment = (data) => {
  const errors = [];
  const rawAdjustment = data?.quantityAdjustment !== undefined
    ? data.quantityAdjustment
    : (data?.quantity !== undefined ? data.quantity : data?.adjustment);

  if (rawAdjustment === undefined || rawAdjustment === null || (typeof rawAdjustment === 'string' && rawAdjustment.trim() === '')) {
    errors.push('quantityAdjustment is required');
  } else if (typeof rawAdjustment === 'string' && /[eE]/.test(rawAdjustment)) {
    errors.push('quantityAdjustment cannot use scientific notation');
  } else if (!Number.isFinite(Number(rawAdjustment))) {
    errors.push('quantityAdjustment must be a valid number');
  } else if (Number(rawAdjustment) === 0) {
    errors.push('quantityAdjustment cannot be zero');
  }

  const reason = data?.reason;
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    errors.push('reason is required');
  } else if (reason.trim().length > 255) {
    errors.push('reason must not exceed 255 characters');
  }

  if (data?.auditNotes !== undefined && data.auditNotes !== null && typeof data.auditNotes !== 'string') {
    errors.push('auditNotes must be a string');
  }

  return { isValid: errors.length === 0, errors };
};

export default {
  validateCreateInventory,
  validateStockUpdate,
  validateStockAdjustment,
};
