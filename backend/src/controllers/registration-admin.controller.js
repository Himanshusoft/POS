import * as adminService from '../services/registration-admin.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const onboardRestaurant = async (req, res, next) => {
  try {
    const ownerObj = req.body.owner || {};
    const rName = req.body.restaurantName || req.body.name;
    const oName = req.body.ownerName || ownerObj.name || (req.body.name !== rName ? req.body.name : undefined);
    const oEmail = req.body.ownerEmail || ownerObj.email || req.body.email;
    const oPass = req.body.ownerPassword || req.body.password || ownerObj.password;

    if (!rName || !oName || !oEmail || !oPass) {
      return sendError(res, 400, 'Missing required fields: restaurantName, ownerName, ownerEmail, password');
    }

    const candidatePhone = req.body.ownerPhone || ownerObj.phone || req.body.phone;
    if (candidatePhone !== undefined && candidatePhone !== null && String(candidatePhone).trim() !== '') {
      const rawPhone = String(candidatePhone).trim();
      if (!/^(\+91[\-\s]?)?[6-9]\d{9}$/.test(rawPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: ['Enter a valid 10-digit Indian mobile number starting with 6-9 (e.g. 9876543210 or +91 9876543210)'],
        });
      }
    }

    const normalizedData = {
      ...req.body,
      restaurantName: rName,
      ownerName: oName,
      ownerEmail: oEmail,
      password: oPass,
      ownerPhone: candidatePhone ? String(candidatePhone).trim() : undefined,
      planId: req.body.planId,
    };

    const result = await adminService.onboardRestaurant(normalizedData);
    return sendSuccess(res, 201, 'Restaurant and owner onboarded successfully with subscription plan', result);
  } catch (error) {
    next(error);
  }
};

export const getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await adminService.getRestaurants(req.query);
    return sendSuccess(res, 200, 'Restaurants retrieved successfully', restaurants);
  } catch (error) {
    next(error);
  }
};

export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await adminService.getRestaurantById(req.params.id);
    return sendSuccess(res, 200, 'Restaurant details retrieved', restaurant);
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return sendError(res, 400, 'isActive boolean field is required');
    }
    const updated = await adminService.updateRestaurantStatus(req.params.id, isActive);
    return sendSuccess(res, 200, `Restaurant has been ${isActive ? 'activated' : 'deactivated'}`, updated);
  } catch (error) {
    next(error);
  }
};

export const updateRestaurantSubscription = async (req, res, next) => {
  try {
    const updated = await adminService.updateRestaurantSubscription(req.params.id, req.body);
    return sendSuccess(res, 200, 'Restaurant subscription updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const resetOwnerCredentials = async (req, res, next) => {
  try {
    const result = await adminService.resetOwnerCredentials(req.params.id, req.body);
    return sendSuccess(res, 200, 'Owner credentials updated successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getPlatformOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getPlatformOverview();
    return sendSuccess(res, 200, 'Platform overview statistics retrieved', overview);
  } catch (error) {
    next(error);
  }
};

export const getPlatformAnalytics = async (req, res, next) => {
  try {
    const { range = '30D' } = req.query;
    const analytics = await adminService.getPlatformAnalytics(range);
    return sendSuccess(res, 200, 'Platform analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};


export const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await adminService.getSubscriptions(req.query);
    return sendSuccess(res, 200, 'All organization subscriptions retrieved successfully', subscriptions);
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionsOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getSubscriptionsOverview();
    return sendSuccess(res, 200, 'Subscriptions overview statistics retrieved successfully', overview);
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await adminService.getSubscriptionByRestaurantId(req.params.restaurantId);
    return sendSuccess(res, 200, 'Subscription details retrieved successfully', subscription);
  } catch (error) {
    next(error);
  }
};

export default {
  onboardRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurantStatus,
  updateRestaurantSubscription,
  resetOwnerCredentials,
  getPlatformOverview,
  getPlatformAnalytics,
  getSubscriptions,
  getSubscriptionsOverview,
  getSubscriptionById,
};
