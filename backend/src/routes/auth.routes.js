import { Router } from 'express';
import { validateUuidParams } from '../validations/resource.validation.js';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import {
  validateRegisterOwner,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetOtp,
  validateResendResetOtp,
  validateResetPassword,
} from '../validations/auth.validation.js';

const router = Router();
validateUuidParams(router);

router.post('/register', validateRequest(validateRegisterOwner), authController.registerOwner);
router.post('/login', validateRequest(validateLogin), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);

// Password recovery / OTP routes
router.post('/forgot-password', validateRequest(validateForgotPassword), authController.forgotPassword);
router.post('/resend-reset-otp', validateRequest(validateResendResetOtp), authController.resendResetOtp);
router.post('/verify-reset-otp', validateRequest(validateVerifyResetOtp), authController.verifyResetOtp);
router.post('/reset-password', validateRequest(validateResetPassword), authController.resetPassword);

export default router;
