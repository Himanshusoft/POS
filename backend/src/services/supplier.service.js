import { prisma } from '../config/env.js';
import { findManyPaginated } from '../utils/pagination.js';
import { normalizePhoneNumber } from '../utils/countryPhoneData.js';

export const createSupplier = async (restaurantId, data) => {
  return await prisma.supplier.create({
    data: {
      restaurantId,
      name: data.name.trim(),
      contactPerson: data.contactPerson || null,
      phone: data.phone ? normalizePhoneNumber(data.phone) : (data.phone === '' ? null : data.phone || null),
      email: data.email || null,
      address: data.address || null,
    },
  });
};

export const getSuppliers = async (restaurantId, filters = {}) => {
  return await findManyPaginated(prisma.supplier, {
    where: { restaurantId },
    include: {
      _count: { select: { purchases: true } },
    },
    orderBy: { name: 'asc' },
  }, filters);
};

export const getSupplierById = async (restaurantId, id) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, restaurantId },
    include: {
      purchases: {
        include: { items: { include: { inventoryItem: true } } },
        orderBy: { purchaseDate: 'desc' },
      },
    },
  });
  if (!supplier) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    throw error;
  }
  return supplier;
};

export const updateSupplier = async (restaurantId, id, data) => {
  await getSupplierById(restaurantId, id);

  return await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      contactPerson: data.contactPerson !== undefined ? data.contactPerson : undefined,
      phone: data.phone !== undefined ? (data.phone ? normalizePhoneNumber(data.phone) : null) : undefined,
      email: data.email !== undefined ? data.email : undefined,
      address: data.address !== undefined ? data.address : undefined,
    },
  });
};

export const deleteSupplier = async (restaurantId, id) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, restaurantId },
    include: { _count: { select: { purchases: true } } },
  });
  if (!supplier) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    throw error;
  }
  if (supplier._count.purchases) {
    const error = new Error('Supplier has purchase history and cannot be deleted');
    error.statusCode = 409;
    throw error;
  }
  return await prisma.supplier.delete({
    where: { id },
  });
};

export default {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};
