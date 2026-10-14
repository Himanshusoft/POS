import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { decodeToken } from '../utils/jwt.js';

export const registerOwner = async (req, res, next) => {
  try {
    const result = await authService.registerOwner(req.body);
    return sendSuccess(res, 201, 'Restaurant and owner account registered successfully', result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let userId = req.user?.id || null;
    if (!userId && token) {
      try {
        const decoded = decodeToken(token);
        userId = decoded?.userId || decoded?.id || null;
      } catch {
        // Safe to ignore decode errors
      }
    }
    await authService.logout(token, userId);
    return sendSuccess(res, 200, 'Logged out successfully', {});
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, 200, 'Current authenticated user profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

export const getMe = getCurrentUser;

export const updateProfile = async (req, res, next) => {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, 200, 'Profile details updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    return sendSuccess(res, 200, 'Password changed successfully', result);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return sendSuccess(res, 200, result.message, {});
  } catch (error) {
    next(error);
  }
};

export const resendResetOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendResetOtp(email);
    return sendSuccess(res, 200, result.message, {});
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyResetOtp({ email, otp });
    return sendSuccess(res, 200, result.message, { resetToken: result.resetToken });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await authService.resetPassword({ resetToken, newPassword });
    return sendSuccess(res, 200, result.message, {});
  } catch (error) {
    next(error);
  }
};

export default {
  registerOwner,
  login,
  logout,
  getCurrentUser,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
};

