import { prisma } from '../config/env.js';
import { serializableTransaction } from '../utils/transaction.js';
import { findManyPaginated } from '../utils/pagination.js';

const STANDARD_REASONS = ['SPOILAGE', 'EXPIRATION', 'PREPARATION_ERROR', 'SPILLAGE', 'OVERPRODUCTION'];

export const formatWastage = (w) => {
  if (!w) return w;

  // If notes already exists as a distinct property on the record, keep it
  if (w.notes !== undefined && w.notes !== null && String(w.notes).trim().length > 0) {
    return {
      ...w,
      incidentNotes: w.notes,
    };
  }

  const rawReason = (w.reason || '').trim();
  let reason = rawReason;
  let notes = null;

  const colonSpaceIdx = rawReason.indexOf(': ');
  const colonIdx = rawReason.indexOf(':');
  const dashIdx = rawReason.indexOf(' — ');
  const hyphenIdx = rawReason.indexOf(' - ');

  if (colonSpaceIdx !== -1) {
    const prefix = rawReason.slice(0, colonSpaceIdx).trim();
    const rest = rawReason.slice(colonSpaceIdx + 2).trim();
    if (STANDARD_REASONS.includes(prefix.toUpperCase()) || prefix.length <= 30) {
      reason = prefix;
      notes = rest;
    }
  } else if (colonIdx !== -1) {
    const prefix = rawReason.slice(0, colonIdx).trim();
    const rest = rawReason.slice(colonIdx + 1).trim();
    if (STANDARD_REASONS.includes(prefix.toUpperCase()) || prefix.length <= 30) {
      reason = prefix;
      notes = rest;
    }
  } else if (dashIdx !== -1) {
    const prefix = rawReason.slice(0, dashIdx).trim();
    const rest = rawReason.slice(dashIdx + 3).trim();
    if (STANDARD_REASONS.includes(prefix.toUpperCase()) || prefix.length <= 30) {
      reason = prefix;
      notes = rest;
    }
  } else if (hyphenIdx !== -1) {
    const prefix = rawReason.slice(0, hyphenIdx).trim();
    const rest = rawReason.slice(hyphenIdx + 3).trim();
    if (STANDARD_REASONS.includes(prefix.toUpperCase()) || prefix.length <= 30) {
      reason = prefix;
      notes = rest;
    }
  } else if (!STANDARD_REASONS.includes(rawReason.toUpperCase()) && rawReason.length > 0) {
    notes = rawReason;
  }

  return {
    ...w,
    reason,
    notes: notes || null,
    incidentNotes: notes || null,
  };
};

export const recordWastage = async (restaurantId, userId, data) => {
  return await serializableTransaction(prisma, async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, restaurantId },
    });

    if (!item) {
      const error = new Error('Inventory item not found');
      error.statusCode = 404;
      throw error;
    }

    const wasteQuantity = Number(data.quantity);
    if (data.unit && data.unit !== item.unit) {
      const error = new Error('Wastage unit must match its inventory item unit; unit conversion is not configured');
      error.statusCode = 422;
      throw error;
    }
    if (wasteQuantity <= 0) {
      const error = new Error('Wastage quantity must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    if (Number(item.currentStock) < wasteQuantity) {
      const error = new Error(
        `Cannot record wastage exceeding current stock. Available: ${item.currentStock} ${item.unit}, Requested: ${wasteQuantity} ${item.unit}`
      );
      error.statusCode = 400;
      throw error;
    }

    const cost = wasteQuantity * Number(item.costPerUnit || 0);

    // Atomically decrement inventory stock
    const stockUpdate = await tx.inventoryItem.updateMany({
      where: { id: item.id, restaurantId, currentStock: { gte: wasteQuantity } },
      data: { currentStock: { decrement: wasteQuantity } },
    });
    if (!stockUpdate.count) {
      const error = new Error('Wastage quantity exceeds current stock');
      error.statusCode = 422;
      throw error;
    }

    const rawReason = (data.reason || 'SPOILAGE').trim();
    const rawNotes = (data.notes !== undefined && data.notes !== null)
      ? String(data.notes).trim()
      : (data.incidentNotes !== undefined && data.incidentNotes !== null
        ? String(data.incidentNotes).trim()
        : (data.incident_notes !== undefined && data.incident_notes !== null
          ? String(data.incident_notes).trim()
          : ''));

    let combinedReason = rawReason;
    if (rawNotes) {
      const hasPrefixColon = rawReason.includes(': ');
      if (!hasPrefixColon) {
        combinedReason = `${rawReason}: ${rawNotes}`;
      } else if (!rawReason.endsWith(rawNotes)) {
        const prefix = rawReason.slice(0, rawReason.indexOf(': ')).trim();
        combinedReason = `${prefix}: ${rawNotes}`;
      }
    }

    const wastage = await tx.wastage.create({
      data: {
        restaurantId,
        inventoryItemId: item.id,
        quantity: wasteQuantity,
        unit: data.unit || item.unit,
        reason: combinedReason,
        cost,
        recordedById: userId,
      },
      include: {
        inventoryItem: true,
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return formatWastage(wastage);
  });
};

export const getWastageList = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  const result = await findManyPaginated(prisma.wastage, {
    where,
    include: {
      inventoryItem: true,
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  }, filters);

  return {
    ...result,
    items: (result.items || []).map(formatWastage),
  };
};

export const getWastageById = async (restaurantId, id) => {
  const wastage = await prisma.wastage.findFirst({
    where: { id, restaurantId },
    include: {
      inventoryItem: true,
      recordedBy: { select: { id: true, name: true } },
    },
  });
  if (!wastage) {
    const error = new Error('Wastage record not found');
    error.statusCode = 404;
    throw error;
  }
  return formatWastage(wastage);
};

export const deleteWastage = async (restaurantId, id) => {
  return await serializableTransaction(prisma, async (tx) => {
    const wastage = await tx.wastage.findFirst({
      where: { id, restaurantId },
    });
    if (!wastage) {
      const error = new Error('Wastage record not found');
      error.statusCode = 404;
      throw error;
    }

    // Restore inventory stock
    await tx.inventoryItem.update({
      where: { id: wastage.inventoryItemId },
      data: {
        currentStock: { increment: Number(wastage.quantity) },
      },
    });

    return await tx.wastage.delete({
      where: { id },
    });
  });
};

export default {
  formatWastage,
  recordWastage,
  getWastageList,
  getWastageById,
  deleteWastage,
};
