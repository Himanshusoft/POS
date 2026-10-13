/**
 * Unit conversion utility for inventory and recipe calculations.
 * Supports mass (KG <-> GRAM) and volume (LITER <-> MILLILITER).
 * Discrete units (PIECE, PACKET, CAN, BOTTLE) require exact match.
 */

const MASS_UNITS = new Set(['KG', 'GRAM']);
const VOLUME_UNITS = new Set(['LITER', 'MILLILITER']);

/**
 * Checks whether two units can be converted to one another.
 * @param {string} unitA
 * @param {string} unitB
 * @returns {boolean}
 */
export const areUnitsCompatible = (unitA, unitB) => {
  if (!unitA || !unitB) return false;
  if (unitA === unitB) return true;
  if (MASS_UNITS.has(unitA) && MASS_UNITS.has(unitB)) return true;
  if (VOLUME_UNITS.has(unitA) && VOLUME_UNITS.has(unitB)) return true;
  return false;
};

/**
 * Converts a quantity from one unit to another.
 * Throws an error if units are incompatible.
 * @param {number|string} quantity
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number} Converted quantity rounded to 4 decimal places.
 */
export const convertQuantity = (quantity, fromUnit, toUnit) => {
  const num = Number(quantity);
  if (isNaN(num)) {
    throw new Error(`Invalid numeric quantity: '${quantity}'`);
  }
  if (!fromUnit || !toUnit) {
    throw new Error(`Invalid units provided: fromUnit='${fromUnit}', toUnit='${toUnit}'`);
  }
  if (fromUnit === toUnit) {
    return Number(num.toFixed(4));
  }

  // Mass conversions
  if (fromUnit === 'GRAM' && toUnit === 'KG') {
    return Number((num / 1000).toFixed(4));
  }
  if (fromUnit === 'KG' && toUnit === 'GRAM') {
    return Number((num * 1000).toFixed(4));
  }

  // Volume conversions
  if (fromUnit === 'MILLILITER' && toUnit === 'LITER') {
    return Number((num / 1000).toFixed(4));
  }
  if (fromUnit === 'LITER' && toUnit === 'MILLILITER') {
    return Number((num * 1000).toFixed(4));
  }

  throw new Error(`Cannot convert quantity between incompatible units '${fromUnit}' and '${toUnit}'`);
};

export default {
  areUnitsCompatible,
  convertQuantity,
};
