import * as userService from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createUser = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    if (!organizationId) {
      return sendError(res, 400, 'Authenticated user is not linked to any organization or restaurant context');
    }
    const staff = await userService.createStaff(organizationId, req.body);
    return sendSuccess(res, 201, 'User account created successfully', staff);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    const users = await userService.getStaffList(organizationId, req.query);
    return sendSuccess(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    const user = await userService.getStaffById(organizationId, req.params.id);
    return sendSuccess(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    const user = await userService.updateStaff(organizationId, req.params.id, req.body);
    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    const user = await userService.updateStaffStatus(organizationId, req.params.id, req.body.isActive);
    return sendSuccess(res, 200, 'User status updated successfully', user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || req.user?.restaurantId;
    await userService.deleteStaff(organizationId, req.params.id);
    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const createStaff = createUser;
export const getStaffList = getUsers;
export const getStaffById = getUserById;
export const updateStaff = updateUser;
export const deleteStaff = deleteUser;

export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  createStaff,
  getStaffList,
  getStaffById,
  updateStaff,
  deleteStaff,
};
