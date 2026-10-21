import * as menuService from '../services/menu.service.js';
import { sendSuccess } from '../utils/response.js';

// Categories
export const createCategory = async (req, res, next) => {
  try {
    const category = await menuService.createCategory(req.user.restaurantId, req.body);
    return sendSuccess(res, 201, 'Menu category created successfully', category);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await menuService.getCategories(req.user.restaurantId, req.query);
    return sendSuccess(res, 200, 'Menu categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await menuService.getCategoryById(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Menu category retrieved successfully', category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await menuService.updateCategory(req.user.restaurantId, req.params.id, req.body);
    return sendSuccess(res, 200, 'Menu category updated successfully', category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await menuService.deleteCategory(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Menu category deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Menu Items
export const createMenuItem = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.imageUrl = `/uploads/menu/${req.file.filename}`;
    }
    if (req.body.price !== undefined) {
      req.body.price = Number(req.body.price);
    }
    if (typeof req.body.isAvailable === 'string') {
      req.body.isAvailable = req.body.isAvailable === 'true';
    }
    if (req.body.categoryId === '' || req.body.categoryId === 'null') {
      req.body.categoryId = null;
    }
    if (req.body.preparationTime !== undefined && req.body.preparationTime !== null && req.body.preparationTime !== '') {
      req.body.preparationTime = Number(req.body.preparationTime);
    }
    if (req.body.prepTime !== undefined && req.body.prepTime !== null && req.body.prepTime !== '') {
      req.body.prepTime = Number(req.body.prepTime);
    }
    const item = await menuService.createMenuItem(req.user.restaurantId, req.body);
    return sendSuccess(res, 201, 'Menu item created successfully', item);
  } catch (error) {
    next(error);
  }
};

export const uploadMenuItemImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select an image.',
      });
    }
    const imageUrl = `/uploads/menu/${req.file.filename}`;
    return sendSuccess(res, 200, 'Image uploaded successfully', { imageUrl });
  } catch (error) {
    next(error);
  }
};

export const getMenuItems = async (req, res, next) => {
  try {
    const result = await menuService.getMenuItems(req.user.restaurantId, req.query);
    return sendSuccess(res, 200, 'Menu items retrieved successfully', result.items, result.meta);
  } catch (error) {
    next(error);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const item = await menuService.getMenuItemById(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Menu item retrieved successfully', item);
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.imageUrl = `/uploads/menu/${req.file.filename}`;
    }
    if (req.body.price !== undefined) {
      req.body.price = Number(req.body.price);
    }
    if (typeof req.body.isAvailable === 'string') {
      req.body.isAvailable = req.body.isAvailable === 'true';
    }
    if (req.body.categoryId === '' || req.body.categoryId === 'null') {
      req.body.categoryId = null;
    }
    if (req.body.removeImage === 'true' || req.body.removeImage === true) {
      req.body.imageUrl = null;
    }
    if (req.body.preparationTime !== undefined && req.body.preparationTime !== null && req.body.preparationTime !== '') {
      req.body.preparationTime = Number(req.body.preparationTime);
    }
    if (req.body.prepTime !== undefined && req.body.prepTime !== null && req.body.prepTime !== '') {
      req.body.prepTime = Number(req.body.prepTime);
    }
    const item = await menuService.updateMenuItem(req.user.restaurantId, req.params.id, req.body);
    return sendSuccess(res, 200, 'Menu item updated successfully', item);
  } catch (error) {
    next(error);
  }
};

export const updateMenuItemAvailability = async (req, res, next) => {
  try {
    const item = await menuService.updateMenuItemAvailability(req.user.restaurantId, req.params.id, req.body.isAvailable);
    return sendSuccess(res, 200, 'Menu item availability updated successfully', item);
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    await menuService.deleteMenuItem(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Menu item deleted successfully');
  } catch (error) {
    next(error);
  }
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
