import { prisma } from '../config/env.js';
import { normalizeCurrencyCode } from '../validations/resource.validation.js';
import { normalizePhoneNumber } from '../utils/countryPhoneData.js';

export const createRestaurant = async (ownerId, data) => {
  return await prisma.$transaction(async (tx) => {
    const owner = await tx.user.findFirst({ where: { id: ownerId, role: 'RESTAURANT_OWNER' } });
    if (!owner) {
      const error = new Error('Owner account not found');
      error.statusCode = 404;
      throw error;
    }
    if (owner.restaurantId) {
      const error = new Error('Owner account is already linked to a restaurant');
      error.statusCode = 409;
      throw error;
    }
    const restaurant = await tx.restaurant.create({
      data: {
        name: data.name,
        address: data.address || null,
        phone: data.phone ? normalizePhoneNumber(data.phone) : (data.phone === '' ? null : data.phone || null),
        email: data.email || null,
        currency: data.currency ? normalizeCurrencyCode(data.currency) : 'USD',
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 5.0,
      },
    });
    await tx.user.update({ where: { id: ownerId }, data: { restaurantId: restaurant.id } });
    return restaurant;
  });
};

export const getRestaurantById = async (id) => {
  if (!id) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          tables: true,
          menuItems: true,
          users: true,
          orders: true,
        },
      },
    },
  });
  if (!restaurant) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }
  return restaurant;
};

export const getRestaurantProfile = async (restaurantId) => {
  return await getRestaurantById(restaurantId);
};

export const updateRestaurantProfile = async (restaurantId, data) => {
  if (!restaurantId) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }
  const result = await prisma.restaurant.updateMany({
    where: { id: restaurantId },
    data: {
      name: data.name || undefined,
      address: data.address !== undefined ? data.address : undefined,
      phone: data.phone !== undefined ? (data.phone ? normalizePhoneNumber(data.phone) : null) : undefined,
      email: data.email !== undefined ? data.email : undefined,
      currency: data.currency ? normalizeCurrencyCode(data.currency) : undefined,
      taxRate: data.taxRate !== undefined ? Number(data.taxRate) : undefined,
    },
  });
  if (!result.count) {
    const error = new Error('Restaurant not found');
    error.statusCode = 404;
    throw error;
  }
  return await getRestaurantById(restaurantId);
};

export default {
  createRestaurant,
  getRestaurantById,
  getRestaurantProfile,
  updateRestaurantProfile,
};
