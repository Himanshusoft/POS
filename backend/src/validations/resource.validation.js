const units = ['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'PACKET', 'CAN', 'BOTTLE'];
const tableStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'];
const result = (errors) => ({ isValid: errors.length === 0, errors });
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
export const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const validateTable = (data, partial = false) => {
  const errors = [];
  if (!partial && (typeof data?.tableNumber !== 'string' || !data.tableNumber.trim())) errors.push('tableNumber is required');
  if (data?.tableNumber !== undefined && (typeof data.tableNumber !== 'string' || !data.tableNumber.trim() || data.tableNumber.length > 30)) errors.push('tableNumber must be a non-empty string of at most 30 characters');
  if (data?.capacity !== undefined && (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) < 1 || Number(data.capacity) > 1000)) errors.push('capacity must be a positive integer');
  if (data?.status !== undefined && !tableStatuses.includes(data.status)) errors.push(`status must be one of ${tableStatuses.join(', ')}`);
  if (partial && !Object.keys(data || {}).some((key) => ['tableNumber', 'capacity', 'status'].includes(key))) errors.push('At least one supported field is required');
  return result(errors);
};

export const validateTableStatus = (data) => result(tableStatuses.includes(data?.status) ? [] : [`status must be one of ${tableStatuses.join(', ')}`]);

export const validateSupplier = (data, partial = false) => {
  const errors = [];
  if (!partial && (typeof data?.name !== 'string' || !data.name.trim())) errors.push('name is required');
  for (const field of ['name', 'contactPerson', 'phone', 'address']) {
    if (data?.[field] !== undefined && (typeof data[field] !== 'string' || data[field].length > 200 || (field === 'name' && !data[field].trim()))) errors.push(`${field} must be a string of at most 200 characters`);
  }
  if (data?.email !== undefined && data.email !== null && (typeof data.email !== 'string' || !validEmail(data.email))) errors.push('email must be valid');
  if (partial && !Object.keys(data || {}).some((key) => ['name', 'contactPerson', 'phone', 'email', 'address'].includes(key))) errors.push('At least one supported field is required');
  return result(errors);
};

export const validatePurchase = (data, partial = false) => {
  const errors = [];
  if (!partial && !isUuid(data?.supplierId)) errors.push('supplierId must be a UUID');
  if (data?.supplierId !== undefined && !isUuid(data.supplierId)) errors.push('supplierId must be a UUID');
  if (data?.items !== undefined) {
    if (!Array.isArray(data.items) || !data.items.length) errors.push('items must contain at least one purchase item');
    else data.items.forEach((item, i) => {
      if (!isUuid(item?.inventoryItemId)) errors.push(`items[${i}].inventoryItemId must be a UUID`);
      if (!Number.isFinite(Number(item?.quantity)) || Number(item.quantity) <= 0) errors.push(`items[${i}].quantity must be positive`);
      if (!Number.isFinite(Number(item?.costPerUnit)) || Number(item.costPerUnit) < 0) errors.push(`items[${i}].costPerUnit must be non-negative`);
    });
  } else if (!partial) errors.push('items is required');
  if (data?.invoiceNumber !== undefined && data.invoiceNumber !== null && (typeof data.invoiceNumber !== 'string' || data.invoiceNumber.length > 100)) errors.push('invoiceNumber must be at most 100 characters');
  if (partial && !Object.keys(data || {}).some((key) => ['supplierId', 'invoiceNumber', 'items'].includes(key))) errors.push('At least one supported field is required');
  return result(errors);
};

export const validateWastage = (data) => result([
  ...(!isUuid(data?.inventoryItemId) ? ['inventoryItemId must be a UUID'] : []),
  ...(!Number.isFinite(Number(data?.quantity)) || Number(data.quantity) <= 0 ? ['quantity must be positive'] : []),
  ...(data?.unit !== undefined && !units.includes(data.unit) ? [`unit must be one of ${units.join(', ')}`] : []),
  ...(typeof data?.reason !== 'string' || !data.reason.trim() || data.reason.length > 500 ? ['reason is required and must be at most 500 characters'] : []),
  ...(data?.notes !== undefined && data.notes !== null && (typeof data.notes !== 'string' || data.notes.length > 2000) ? ['notes must be a string of at most 2000 characters'] : []),
  ...(data?.incidentNotes !== undefined && data.incidentNotes !== null && (typeof data.incidentNotes !== 'string' || data.incidentNotes.length > 2000) ? ['incidentNotes must be a string of at most 2000 characters'] : []),
]);

export const validateAvailability = (data) => result(typeof data?.isAvailable === 'boolean' ? [] : ['isAvailable must be a boolean']);

export const validateInventoryUpdate = (data) => {
  const errors = [];
  const supported = ['name', 'sku', 'currentStock', 'openingStock', 'minStockThreshold', 'minSafeLevel', 'minStockLevel', 'unit', 'costPerUnit', 'costPrice', 'cost'];
  if (!Object.keys(data || {}).some((key) => supported.includes(key))) errors.push('At least one supported field is required');
  if (data?.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120)) errors.push('name must be a non-empty string of at most 120 characters');
  for (const field of ['currentStock', 'openingStock', 'minStockThreshold', 'minSafeLevel', 'minStockLevel', 'costPerUnit', 'costPrice', 'cost']) {
    if (data?.[field] !== undefined && (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0)) errors.push(`${field} must be non-negative`);
  }
  if (data?.unit !== undefined && !units.includes(data.unit)) errors.push(`unit must be one of ${units.join(', ')}`);
  if (data?.sku !== undefined && data.sku !== null && data.sku !== '') {
    if (typeof data.sku !== 'string' || data.sku.trim().length > 50) {
      errors.push('sku must be a string of at most 50 characters');
    }
  }
  return result(errors);
};

export const normalizeCurrencyCode = (val) => {
  if (!val || typeof val !== 'string') return val;
  const str = val.trim();
  if (/^[A-Za-z]{3}$/.test(str)) return str.toUpperCase();
  const match = str.match(/\b([A-Za-z]{3})\b/);
  if (match) return match[1].toUpperCase();
  const symbolMap = { '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', 'د.إ': 'AED' };
  for (const [sym, code] of Object.entries(symbolMap)) {
    if (str.includes(sym)) return code;
  }
  return str.toUpperCase();
};

export const validateRestaurantProfile = (data, partial = false) => {
  const errors = [];
  if (!partial && (typeof data?.name !== 'string' || !data.name.trim())) errors.push('name is required');
  if (data?.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 150)) errors.push('name must be a non-empty string of at most 150 characters');
  if (data?.email !== undefined && data.email !== null && (typeof data.email !== 'string' || !validEmail(data.email))) errors.push('email must be valid');
  if (data?.taxRate !== undefined && (!Number.isFinite(Number(data.taxRate)) || Number(data.taxRate) < 0 || Number(data.taxRate) > 100)) errors.push('taxRate must be between 0 and 100');
  if (data?.currency !== undefined && typeof data.currency === 'string') {
    data.currency = normalizeCurrencyCode(data.currency);
  }
  if (data?.currency !== undefined && (typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency))) errors.push('currency must be a three-letter uppercase currency code');
  if (partial && !Object.keys(data || {}).some((key) => ['name', 'address', 'phone', 'email', 'currency', 'taxRate'].includes(key))) errors.push('At least one supported field is required');
  return result(errors);
};

export const validateRecipeUpdate = (data) => result([
  ...(data?.instructions !== undefined && data.instructions !== null && (typeof data.instructions !== 'string' || data.instructions.length > 5000) ? ['instructions must be a string of at most 5000 characters'] : []),
  ...(data?.prepTime !== undefined && data.prepTime !== null && (!Number.isInteger(Number(data.prepTime)) || Number(data.prepTime) < 0) ? ['prepTime must be a non-negative integer'] : []),
  ...(!Object.keys(data || {}).some((key) => ['instructions', 'prepTime'].includes(key)) ? ['At least one supported field is required'] : []),
]);

export const validateRecipeIngredientUpdate = (data) => result([
  ...(data?.quantityRequired !== undefined && (!Number.isFinite(Number(data.quantityRequired)) || Number(data.quantityRequired) <= 0) ? ['quantityRequired must be positive'] : []),
  ...(data?.unit !== undefined && !units.includes(data.unit) ? [`unit must be one of ${units.join(', ')}`] : []),
  ...(!Object.keys(data || {}).some((key) => ['quantityRequired', 'unit'].includes(key)) ? ['At least one supported field is required'] : []),
]);

export const validateBillUpdate = (data) => {
  const errors = [];
  const hasField = data && Object.keys(data).some((k) => ['discountAmount', 'discountPercent', 'taxRate', 'notes'].includes(k));
  if (!hasField) {
    errors.push('At least one of discountAmount, discountPercent, taxRate, or notes is required');
  }
  if (data?.discountAmount !== undefined && (!Number.isFinite(Number(data.discountAmount)) || Number(data.discountAmount) < 0)) {
    errors.push('discountAmount must be non-negative');
  }
  if (data?.discountPercent !== undefined && (!Number.isFinite(Number(data.discountPercent)) || Number(data.discountPercent) < 0 || Number(data.discountPercent) > 100)) {
    errors.push('discountPercent must be between 0 and 100');
  }
  if (data?.taxRate !== undefined && (!Number.isFinite(Number(data.taxRate)) || Number(data.taxRate) < 0 || Number(data.taxRate) > 100)) {
    errors.push('taxRate must be between 0 and 100');
  }
  return result(errors);
};

export const validateOrderUpdate = (data) => result([
  ...(data?.notes !== undefined && data.notes !== null && (typeof data.notes !== 'string' || data.notes.length > 2000) ? ['notes must be at most 2000 characters'] : []),
  ...(data?.customerName !== undefined && data.customerName !== null && (typeof data.customerName !== 'string' || data.customerName.length > 150) ? ['customerName must be at most 150 characters'] : []),
  ...(!Object.keys(data || {}).some((key) => ['notes', 'customerName'].includes(key)) ? ['At least one supported field is required'] : []),
]);

export const validateOrderItemStatus = (data) => result(
  ['PENDING', 'COOKING', 'READY', 'SERVED', 'CANCELLED'].includes(data?.status) ? [] : ['status must be a valid order item status'],
);

export const validateUuidParams = (router, names = ['id', 'menuItemId', 'orderId', 'billId', 'recipeId', 'ingredientId', 'itemId']) => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const name of names) {
    router.param(name, (req, res, next, value) => {
      if (!uuid.test(value)) return res.status(422).json({ success: false, message: `Invalid ${name}`, errors: [`${name} must be a UUID`] });
      next();
    });
  }
};
