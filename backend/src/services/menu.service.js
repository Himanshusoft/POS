import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/env.js';
import { findManyPaginated } from '../utils/pagination.js';
import { evaluateMenuItemAvailability } from './inventoryAvailability.service.js';
import { cachedQuery, buildCacheKey, invalidateMenuCache } from '../utils/cache.js';
import { deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/cloudinaryUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const removeLocalUploadFile = (relativeUrl) => {
  if (!relativeUrl || typeof relativeUrl !== 'string' || !relativeUrl.startsWith('/uploads/menu/')) {
    return;
  }
  try {
    const filename = path.basename(relativeUrl);
    const fullPath = path.join(__dirname, '../../uploads/menu', filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Failed to cleanup local menu image file:', err.message);
  }
};

// Categories
export const createCategory = async (restaurantId, data) => {
  const name = data.name.trim();
  const existing = await prisma.menuCategory.findUnique({
    where: {
      restaurantId_name: {
        restaurantId,
        name,
      },
    },
  });

  if (existing) {
    const error = new Error(`Menu category '${name}' already exists`);
    error.statusCode = 409;
    throw error;
  }

  const result = await prisma.menuCategory.create({
    data: {
      restaurantId,
      name,
      description: data.description || null,
    },
  });
  await invalidateMenuCache(restaurantId);
  return result;
};

export const getCategories = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'menu:categories', filters);
  return await cachedQuery(cacheKey, 300, async () => {
    return await findManyPaginated(prisma.menuCategory, {
      where: { restaurantId },
      include: {
        _count: { select: { menuItems: true } },
      },
      orderBy: { name: 'asc' },
    }, filters);
  });
};

export const getCategoryById = async (restaurantId, id) => {
  const category = await prisma.menuCategory.findFirst({
    where: { id, restaurantId },
    include: {
      menuItems: true,
      _count: { select: { menuItems: true } },
    },
  });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

export const updateCategory = async (restaurantId, id, data) => {
  await getCategoryById(restaurantId, id);

  const result = await prisma.menuCategory.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      description: data.description !== undefined ? data.description : undefined,
    },
  });
  await invalidateMenuCache(restaurantId);
  return result;
};

export const deleteCategory = async (restaurantId, id) => {
  await getCategoryById(restaurantId, id);

  const result = await prisma.menuCategory.delete({
    where: { id },
  });
  await invalidateMenuCache(restaurantId);
  return result;
};

// Menu Items
export const createMenuItem = async (restaurantId, data) => {
  const name = data.name.trim();
  const existing = await prisma.menuItem.findUnique({
    where: {
      restaurantId_name: {
        restaurantId,
        name,
      },
    },
  });

  if (existing) {
    const error = new Error(`Menu item '${name}' already exists in this restaurant`);
    error.statusCode = 409;
    throw error;
  }

  if (data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
    });
    if (!category) {
      const error = new Error('Specified menu category not found in this restaurant');
      error.statusCode = 404;
      throw error;
    }
  }

  // Enforce Subscription Plan Menu Item Limits
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId },
    include: { plan: true },
  });
  if (subscription && subscription.status === 'ACTIVE' && subscription.plan) {
    const currentItemCount = await prisma.menuItem.count({ where: { restaurantId } });
    if (currentItemCount >= subscription.plan.maxMenuItems) {
      const error = new Error(`Menu item limit reached for your ${subscription.plan.name} (${subscription.plan.maxMenuItems} max). Please contact Super Admin to upgrade.`);
      error.statusCode = 422;
      throw error;
    }
  }

  const rawPrep = data.preparationTime !== undefined ? data.preparationTime : data.prepTime;
  const prepTimeVal = rawPrep !== undefined && rawPrep !== null && rawPrep !== '' ? Number(rawPrep) : null;
  const imagePublicId = data.imagePublicId !== undefined ? data.imagePublicId : (data.imageUrl ? extractPublicIdFromUrl(data.imageUrl) : null);

  const createData = {
    restaurantId,
    categoryId: data.categoryId || null,
    name,
    description: data.description || null,
    price: Number(data.price),
    imageUrl: data.imageUrl || null,
    ...(imagePublicId ? { imagePublicId } : {}),
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    dietary: data.dietary || null,
    ...(prepTimeVal !== null ? {
      recipe: {
        create: {
          prepTime: prepTimeVal,
        },
      },
    } : {}),
  };

  let result;
  try {
    result = await prisma.menuItem.create({
      data: createData,
      include: {
        category: true,
        recipe: {
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    });
  } catch (err) {
    if (createData.imagePublicId && err.message && (err.message.includes('imagePublicId') || err.code === 'P2002' || err.code === 'P2009' || err.code === 'P2019')) {
      delete createData.imagePublicId;
      result = await prisma.menuItem.create({
        data: createData,
        include: {
          category: true,
          recipe: {
            include: {
              ingredients: {
                include: { inventoryItem: true },
              },
            },
          },
        },
      });
    } else {
      throw err;
    }
  }

  await invalidateMenuCache(restaurantId);
  return {
    ...result,
    preparationTime: result.recipe?.prepTime ?? prepTimeVal ?? null,
    prepTime: result.recipe?.prepTime ?? prepTimeVal ?? null,
  };
};

export const getMenuItems = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'menu:items', filters);
  return await cachedQuery(cacheKey, 30, async () => {
    const where = { restaurantId };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.dietary) where.dietary = filters.dietary;
    if (filters.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable === 'true' || filters.isAvailable === true;
    }
    if (filters.search) {
      where.name = { contains: String(filters.search), mode: 'insensitive' };
    }

    const result = await findManyPaginated(prisma.menuItem, {
      where,
      include: {
        category: true,
        recipe: { include: { ingredients: { include: { inventoryItem: true } } } },
      },
      orderBy: { name: 'asc' },
    }, filters);

    result.items = result.items.map((item) => {
      const availability = evaluateMenuItemAvailability(item, 1);
      return {
        ...item,
        preparationTime: item.recipe?.prepTime ?? null,
        prepTime: item.recipe?.prepTime ?? null,
        inventoryAvailability: availability,
        isOrderable: availability.isOrderable,
        maxOrderableQuantity: availability.maxOrderableQuantity,
      };
    });

    return result;
  });
};

export const getMenuItemById = async (restaurantId, id) => {
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurantId },
    include: {
      category: true,
      recipe: {
        include: {
          ingredients: {
            include: { inventoryItem: true },
          },
        },
      },
    },
  });
  if (!item) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  const availability = evaluateMenuItemAvailability(item, 1);
  return {
    ...item,
    preparationTime: item.recipe?.prepTime ?? null,
    prepTime: item.recipe?.prepTime ?? null,
    inventoryAvailability: availability,
    isOrderable: availability.isOrderable,
    maxOrderableQuantity: availability.maxOrderableQuantity,
  };
};

export const updateMenuItem = async (restaurantId, id, data) => {
  const existingItem = await getMenuItemById(restaurantId, id);

  if (data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
      select: { id: true },
    });
    if (!category) {
      const error = new Error('Specified menu category not found in this restaurant');
      error.statusCode = 404;
      throw error;
    }
  }

  const oldPublicId = existingItem.imagePublicId || extractPublicIdFromUrl(existingItem.imageUrl);
  const oldImageUrl = existingItem.imageUrl;

  let targetImageUrl = undefined;
  let targetImagePublicId = undefined;
  let imageChanged = false;

  if (data.removeImage === true || data.removeImage === 'true' || data.imageUrl === null) {
    targetImageUrl = null;
    targetImagePublicId = null;
    imageChanged = Boolean(existingItem.imageUrl || existingItem.imagePublicId);
  } else if (data.imageUrl !== undefined) {
    targetImageUrl = data.imageUrl;
    targetImagePublicId = data.imagePublicId !== undefined ? data.imagePublicId : extractPublicIdFromUrl(data.imageUrl);
    imageChanged = (existingItem.imageUrl !== targetImageUrl);
  }

  const rawPrep = data.preparationTime !== undefined ? data.preparationTime : data.prepTime;
  const prepTimeVal = rawPrep !== undefined && rawPrep !== null && rawPrep !== '' ? Number(rawPrep) : (rawPrep === null ? null : undefined);

  const updateData = {
    name: data.name ? data.name.trim() : undefined,
    description: data.description !== undefined ? data.description : undefined,
    price: data.price !== undefined ? Number(data.price) : undefined,
    categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
    imageUrl: targetImageUrl,
    ...(targetImagePublicId !== undefined ? { imagePublicId: targetImagePublicId } : {}),
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : undefined,
    dietary: data.dietary !== undefined ? (data.dietary || null) : undefined,
    ...(prepTimeVal !== undefined ? {
      recipe: {
        upsert: {
          create: {
            prepTime: prepTimeVal,
          },
          update: {
            prepTime: prepTimeVal,
          },
        },
      },
    } : {}),
  };

  let result;
  try {
    result = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        recipe: {
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    });
  } catch (err) {
    if (updateData.imagePublicId !== undefined && err.message && (err.message.includes('imagePublicId') || err.code === 'P2009' || err.code === 'P2019')) {
      delete updateData.imagePublicId;
      result = await prisma.menuItem.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          recipe: {
            include: {
              ingredients: {
                include: { inventoryItem: true },
              },
            },
          },
        },
      });
    } else {
      throw err;
    }
  }

  // Section 10 replacement order: delete old image asset only AFTER DB update succeeds
  if (imageChanged) {
    if (oldPublicId && oldPublicId !== targetImagePublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (cleanupErr) {
        console.error('Failed to cleanup old Cloudinary image:', cleanupErr.message || cleanupErr);
      }
    }
    if (oldImageUrl && oldImageUrl !== targetImageUrl) {
      removeLocalUploadFile(oldImageUrl);
    }
  }

  await invalidateMenuCache(restaurantId);
  return {
    ...result,
    preparationTime: result.recipe?.prepTime ?? (prepTimeVal !== undefined ? prepTimeVal : null),
    prepTime: result.recipe?.prepTime ?? (prepTimeVal !== undefined ? prepTimeVal : null),
  };
};

export const updateMenuItemAvailability = async (restaurantId, id, isAvailable) => {
  await getMenuItemById(restaurantId, id);

  const result = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable },
    include: { category: true },
  });
  await invalidateMenuCache(restaurantId);
  return result;
};

export const deleteMenuItem = async (restaurantId, id) => {
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurantId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!item) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }
  if (item._count.orderItems) {
    const error = new Error('Menu item has order history and cannot be deleted');
    error.statusCode = 409;
    throw error;
  }

  // Delete Cloudinary asset if present
  const publicId = item.imagePublicId || extractPublicIdFromUrl(item.imageUrl);
  if (publicId) {
    try {
      await deleteFromCloudinary(publicId);
    } catch (err) {
      console.error('Failed to remove Cloudinary image on menu item delete:', err.message || err);
    }
  }

  // Delete local file if it was a legacy local upload
  if (item.imageUrl) {
    removeLocalUploadFile(item.imageUrl);
  }

  const result = await prisma.menuItem.delete({
    where: { id },
  });
  await invalidateMenuCache(restaurantId);
  return result;
};

export default {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem,
};
