import { isUuid } from './resource.validation.js';

export const validateGenerateBill = (data) => {
  const errors = [];
  if (!isUuid(data?.orderId)) {
    errors.push('orderId must be a UUID');
  }
  if (data?.discountAmount !== undefined) {
    if ((typeof data.discountAmount === 'string' && /[eE]/.test(data.discountAmount)) || isNaN(Number(data.discountAmount)) || Number(data.discountAmount) < 0) {
      errors.push('discountAmount cannot be negative or use scientific notation');
    }
  }
  if (data?.discountPercent !== undefined) {
    if ((typeof data.discountPercent === 'string' && /[eE]/.test(data.discountPercent)) || isNaN(Number(data.discountPercent)) || Number(data.discountPercent) < 0 || Number(data.discountPercent) > 100) {
      errors.push('discountPercent must be a valid number between 0 and 100');
    }
  }
  if (data?.taxRate !== undefined) {
    if ((typeof data.taxRate === 'string' && /[eE]/.test(data.taxRate)) || isNaN(Number(data.taxRate)) || Number(data.taxRate) < 0 || Number(data.taxRate) > 100) {
      errors.push('taxRate must be a valid number between 0 and 100');
    }
  }
  return { isValid: errors.length === 0, errors };
};

export const validatePayment = (data) => {
  const errors = [];
  const validMethods = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'OTHER', 'RAZORPAY'];
  if (!isUuid(data?.billId)) {
    errors.push('billId must be a UUID');
  }
  const rawAmount = data?.amount !== undefined ? data.amount : data?.amountPaid;
  if (rawAmount === undefined || (typeof rawAmount === 'string' && /[eE]/.test(rawAmount)) || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
    errors.push('Payment amount must be greater than 0');
  }
  const rawMethod = data?.method !== undefined ? data.method : data?.paymentMethod;
  if (!rawMethod || !validMethods.includes(rawMethod)) {
    errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
  }
  return { isValid: errors.length === 0, errors };
};

export const validateRazorpayOrder = (data) => {
  const errors = [];
  if (!isUuid(data?.billId)) {
    errors.push('billId must be a valid UUID');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateRazorpayVerify = (data) => {
  const errors = [];
  if (!isUuid(data?.billId)) {
    errors.push('billId must be a valid UUID');
  }
  if (!data?.razorpayOrderId || typeof data.razorpayOrderId !== 'string') {
    errors.push('razorpayOrderId is required');
  }
  if (!data?.razorpayPaymentId || typeof data.razorpayPaymentId !== 'string') {
    errors.push('razorpayPaymentId is required');
  }
  if (!data?.razorpaySignature || typeof data.razorpaySignature !== 'string') {
    errors.push('razorpaySignature is required');
  }
  return { isValid: errors.length === 0, errors };
};

export default {
  validateGenerateBill,
  validatePayment,
  validateRazorpayOrder,
  validateRazorpayVerify,
};
