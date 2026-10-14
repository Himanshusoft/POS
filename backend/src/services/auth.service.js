import crypto from 'crypto';
import { prisma, env } from '../config/env.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { sendPasswordResetOtpEmail } from './email.service.js';
import { revokeToken, invalidateUserAuthCache } from '../utils/cache.js';

export const registerOwner = async (data) => {
  const email = data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(data.password);

  return await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: data.restaurantName || data.restaurant_name,
        address: data.address || null,
        phone: data.phone || null,
        email,
        currency: data.currency || 'USD',
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : (data.tax_rate !== undefined ? Number(data.tax_rate) : 5.0),
      },
    });

    const user = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: data.name,
        email,
        password: hashedPassword,
        role: 'RESTAURANT_OWNER',
        phone: data.phone || null,
      },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      role: user.role,
      restaurantId: restaurant.id,
    });

    return { user, restaurant, token };
  });
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('User account has been deactivated. Please contact your restaurant owner.');
    error.statusCode = 403;
    throw error;
  }

  if (user.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
    });
    if (restaurant && !restaurant.isActive) {
      const error = new Error('This restaurant establishment has been suspended. Please contact platform administration.');
      error.statusCode = 403;
      throw error;
    }
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    restaurantId: user.restaurantId,
  });

  const userWithoutPassword = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
  };

  return {
    user: userWithoutPassword,
    token,
  };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      restaurantId: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      restaurant: {
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      },
    },
  });
  if (!user) {
    const error = new Error('User profile not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const updateProfile = async (userId, data) => {
  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.email) {
    const nextEmail = data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email: nextEmail, NOT: { id: userId } },
    });
    if (existing) {
      const error = new Error('This email address is already in use');
      error.statusCode = 409;
      throw error;
    }
    updateData.email = nextEmail;
  }

  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      restaurantId: true,
    },
  });
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: 'Password updated successfully' };
};

/**
 * Hash an OTP with sha256 and pepper for safe storage
 */
const hashOtp = (email, otp) => {
  return crypto
    .createHash('sha256')
    .update(`${email.trim().toLowerCase()}:${otp.trim()}:${env.JWT_SECRET || 'pos_secure_salt'}`)
    .digest('hex');
};

/**
 * Hash a reset authorization token with sha256 for safe storage
 */
const hashResetToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(`${token.trim()}:${env.JWT_SECRET || 'pos_secure_salt'}`)
    .digest('hex');
};

/**
 * Initiate Forgot Password flow: Generate 6-digit OTP, store securely, and dispatch email via SMTP
 */
export const forgotPassword = async (emailInput) => {
  const email = (emailInput || '').trim().toLowerCase();

  // Find user by normalized email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Account enumeration protection: Return generic message if user doesn't exist or is deactivated
  if (!user || !user.isActive) {
    return {
      message: 'If the email is registered, a verification code has been sent.',
    };
  }

  // Rate limiting / cooldown check: 60-second cooldown between consecutive OTP requests
  if (user.passwordResetOtpExpiresAt) {
    const timeRemaining = user.passwordResetOtpExpiresAt.getTime() - Date.now();
    const elapsedMs = 10 * 60 * 1000 - timeRemaining;
    if (elapsedMs < 60 * 1000 && !user.passwordResetOtpUsed) {
      const waitSec = Math.ceil((60000 - elapsedMs) / 1000);
      const error = new Error(`Please wait ${waitSec} seconds before requesting a new verification code.`);
      error.statusCode = 429;
      throw error;
    }
  }

  // Generate cryptographically secure 6-digit OTP (100000 to 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(email, otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Persist OTP hash, 10-minute expiry, reset attempt counter, clear previous tokens
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetOtpHash: otpHash,
      passwordResetOtpExpiresAt: expiresAt,
      passwordResetOtpAttempts: 0,
      passwordResetOtpUsed: false,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    },
  });

  // Dispatch OTP email via SMTP
  await sendPasswordResetOtpEmail({
    to: user.email,
    recipientName: user.name,
    otp,
  });

  return {
    message: 'If the email is registered, a verification code has been sent.',
  };
};

/**
 * Resend OTP with 60-second cooldown protection
 */
export const resendResetOtp = async (emailInput) => {
  const email = (emailInput || '').trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Account enumeration protection
  if (!user || !user.isActive) {
    return {
      message: 'If the email is registered, a new verification code has been sent.',
    };
  }

  // Enforce 60-second cooldown from previous request
  if (user.passwordResetOtpExpiresAt) {
    const timeRemaining = user.passwordResetOtpExpiresAt.getTime() - Date.now();
    const elapsedMs = 10 * 60 * 1000 - timeRemaining;
    if (elapsedMs < 60 * 1000) {
      const waitSec = Math.ceil((60000 - elapsedMs) / 1000);
      const error = new Error(`Please wait ${waitSec} seconds before requesting a new verification code.`);
      error.statusCode = 429;
      throw error;
    }
  }

  // Generate new single-use 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(email, otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate previous OTP and store fresh OTP state
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetOtpHash: otpHash,
      passwordResetOtpExpiresAt: expiresAt,
      passwordResetOtpAttempts: 0,
      passwordResetOtpUsed: false,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    },
  });

  await sendPasswordResetOtpEmail({
    to: user.email,
    recipientName: user.name,
    otp,
  });

  return {
    message: 'If the email is registered, a new verification code has been sent.',
  };
};

/**
 * Verify OTP: Validate attempts, expiration, constant-time compare hash, issue resetToken
 */
export const verifyResetOtp = async ({ email: emailInput, otp: otpInput }) => {
  const email = (emailInput || '').trim().toLowerCase();
  const otp = String(otpInput || '').trim();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  // Check if OTP was already used or not requested
  if (user.passwordResetOtpUsed || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
    const error = new Error('Invalid or expired verification code. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // Check OTP expiration (10 minutes)
  if (new Date() > new Date(user.passwordResetOtpExpiresAt)) {
    const error = new Error('Verification code has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // Check maximum failed verification attempts (max 5 attempts)
  if (user.passwordResetOtpAttempts >= 5) {
    // Invalidate OTP completely
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtpUsed: true,
        passwordResetOtpHash: null,
      },
    });
    const error = new Error('Too many incorrect attempts. This verification code has been invalidated. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // Hash candidate OTP and compare safely
  const candidateHash = hashOtp(email, otp);
  const isMatch = candidateHash === user.passwordResetOtpHash;

  if (!isMatch) {
    const nextAttempts = user.passwordResetOtpAttempts + 1;
    const isExceeded = nextAttempts >= 5;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtpAttempts: nextAttempts,
        ...(isExceeded ? { passwordResetOtpUsed: true, passwordResetOtpHash: null } : {}),
      },
    });

    const remainingAttempts = Math.max(0, 5 - nextAttempts);
    const msg = remainingAttempts > 0
      ? `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
      : 'Too many incorrect attempts. This verification code has been invalidated. Please request a new code.';
    const error = new Error(msg);
    error.statusCode = 400;
    throw error;
  }

  // Successful verification:
  // Invalidate OTP immediately so it can NEVER be reused
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawResetToken);
  const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to reset password

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetOtpUsed: true,
      passwordResetOtpHash: null,
      passwordResetOtpAttempts: 0,
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: tokenExpiresAt,
    },
  });

  return {
    resetToken: rawResetToken,
    message: 'Verification code verified successfully',
  };
};

/**
 * Reset Password using verified short-lived reset authorization token
 */
export const resetPassword = async ({ resetToken, newPassword }) => {
  if (!resetToken || typeof resetToken !== 'string') {
    const error = new Error('Reset authorization token is required');
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashResetToken(resetToken);

  // Find user by reset token hash
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash },
  });

  if (!user) {
    const error = new Error('Invalid or expired reset session. Please restart password recovery.');
    error.statusCode = 400;
    throw error;
  }

  // Verify reset token expiration
  if (!user.passwordResetTokenExpiresAt || new Date() > new Date(user.passwordResetTokenExpiresAt)) {
    const error = new Error('Password reset session has expired. Please restart password recovery.');
    error.statusCode = 400;
    throw error;
  }

  // Validate password policy: min 8 chars, 1 uppercase, 1 lowercase, 1 number
  if (
    !newPassword ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    const error = new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password using bcrypt
  const hashedPassword = await hashPassword(newPassword);

  // Update password and invalidate all reset state
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetOtpHash: null,
      passwordResetOtpExpiresAt: null,
      passwordResetOtpAttempts: 0,
      passwordResetOtpUsed: true,
    },
  });

  return {
    message: 'Password updated successfully',
  };
};

export const logout = async (token, userId) => {
  if (token) {
    await revokeToken(token);
  }
  if (userId) {
    await invalidateUserAuthCache(userId);
  }
  return { message: 'Logged out successfully' };
};

export default {
  registerOwner,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
};
