import * as orderService from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.restaurantId, req.user.id, req.body);
    return sendSuccess(res, 201, 'Order created successfully and sent to central POS', order);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrders(req.user.restaurantId, req.query);
    return sendSuccess(res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Order retrieved successfully', order);
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req, res, next) => {
  try {
    const order = await orderService.updateOrder(req.user.restaurantId, req.params.id, req.body);
    return sendSuccess(res, 200, 'Order updated successfully', order);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Order cancelled successfully', order);
  } catch (error) {
    next(error);
  }
};

export const getActiveOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getActiveOrders(req.user.restaurantId, req.query);
    return sendSuccess(res, 200, 'Active orders retrieved successfully', orders);
  } catch (error) {
    next(error);
  }
};

export const addItemsToOrder = async (req, res, next) => {
  try {
    const order = await orderService.addItemsToOrder(req.user.restaurantId, req.user.id, req.params.id, req.body);
    return sendSuccess(res, 200, 'Additional items added to active order successfully', order);
  } catch (error) {
    next(error);
  }
};

export const markServed = async (req, res, next) => {
  try {
    const order = await orderService.markServed(req.user.restaurantId, req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Order marked as SERVED successfully', order);
  } catch (error) {
    next(error);
  }
};

export const sendToKitchen = async (req, res, next) => {
  try {
    const order = await orderService.sendToKitchen(req.user.restaurantId, req.params.id, req.user.id);
    return sendSuccess(res, 200, 'Order sent to kitchen successfully', order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.user.restaurantId, req.params.id, status);
    return sendSuccess(res, 200, `Order status updated to '${status}' successfully`, order);
  } catch (error) {
    next(error);
  }
};

export const requestBill = async (req, res, next) => {
  try {
    const order = await orderService.requestBill(req.user.restaurantId, req.user.id, req.params.id);
    return sendSuccess(res, 200, 'Bill request sent to Reception successfully', order);
  } catch (error) {
    next(error);
  }
};

export const cancelBillRequest = async (req, res, next) => {
  try {
    const order = await orderService.cancelBillRequest(req.user.restaurantId, req.params.id);
    return sendSuccess(res, 200, 'Bill request cancelled successfully', order);
  } catch (error) {
    next(error);
  }
};

export const validateCart = async (req, res, next) => {
  try {
    const result = await orderService.validateCartAvailability(req.user.restaurantId, req.body.items || []);
    return sendSuccess(res, 200, 'Inventory is sufficient for all requested items', result);
  } catch (error) {
    next(error);
  }
};

export default {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  getActiveOrders,
  addItemsToOrder,
  requestBill,
  cancelBillRequest,
  markServed,
  sendToKitchen,
  updateOrderStatus,
  validateCart,
};
