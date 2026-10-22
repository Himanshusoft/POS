import waiterService from '../services/waiter.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getWaiterDashboard = async (req, res, next) => {
  try {
    const restaurantId = req.user?.organizationId || req.user?.restaurantId;
    if (!restaurantId) {
      return sendError(res, 400, 'Authenticated waiter is not associated with an active organization or restaurant');
    }
    const waiterId = req.user.id;
    const dashboard = await waiterService.getWaiterDashboard(restaurantId, waiterId);
    return sendSuccess(res, 200, 'Waiter dashboard data retrieved successfully', dashboard);
  } catch (error) {
    next(error);
  }
};

export default {
  getWaiterDashboard,
};
