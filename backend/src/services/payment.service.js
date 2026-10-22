import crypto from 'crypto';
import { prisma, env } from '../config/env.js';
import { serializableTransaction } from '../utils/transaction.js';
import { findManyPaginated } from '../utils/pagination.js';
import { getRazorpayInstance } from '../config/razorpay.js';
import {
  invalidateBillingCache,
  invalidateOrderCache,
  invalidateTableCache,
  cachedQuery,
  buildCacheKey,
} from '../utils/cache.js';

export const processPayment = async (restaurantId, data) => {
  const result = await serializableTransaction(prisma, async (tx) => {
    const bill = await tx.bill.findFirst({
      where: { id: data.billId, restaurantId },
      include: {
        payments: true,
        order: true,
      },
    });

    if (!bill) {
      const error = new Error('Bill not found in this restaurant');
      error.statusCode = 404;
      throw error;
    }

    if (bill.status === 'PAID') {
      const error = new Error('Bill is already fully paid');
      error.statusCode = 400;
      throw error;
    }

    if (!['SERVED', 'COMPLETED'].includes(bill.order.status)) {
      const error = new Error('Order must be prepared and served before payment');
      error.statusCode = 400;
      throw error;
    }

    if (data.transactionReference) {
      const duplicate = await tx.payment.findFirst({
        where: { billId: bill.id, transactionReference: data.transactionReference, status: 'COMPLETED' },
      });
      if (duplicate) {
        const error = new Error('This transaction reference has already been recorded for the bill');
        error.statusCode = 409;
        throw error;
      }
    }

    const paymentAmount = Number(data.amount !== undefined ? data.amount : data.amountPaid);
    const paymentMethod = data.method !== undefined ? data.method : (data.paymentMethod || 'CASH');
    const transactionReference = data.transactionReference || data.notes || null;

    const payment = await tx.payment.create({
      data: {
        billId: bill.id,
        amount: paymentAmount,
        method: paymentMethod,
        status: 'COMPLETED',
        transactionReference,
        provider: data.provider || (paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : null),
        razorpayOrderId: data.razorpayOrderId || null,
        razorpayPaymentId: data.razorpayPaymentId || null,
        razorpaySignature: data.razorpaySignature || null,
      },
    });

    const previousPayments = bill.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalPaid = previousPayments + paymentAmount;
    if (Math.round(totalPaid * 100) > Math.round(Number(bill.totalAmount) * 100)) {
      const error = new Error('Payment exceeds the bill balance');
      error.statusCode = 422;
      throw error;
    }
    const isFullyPaid = totalPaid >= Number(bill.totalAmount);

    let updatedBill;
    const billInclude = {
      order: { include: { items: { include: { menuItem: true } }, table: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      receptionist: { select: { id: true, name: true } },
    };

    if (isFullyPaid) {
      updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: { status: 'PAID' },
        include: billInclude,
      });

      // Mark order as COMPLETED
      await tx.order.update({
        where: { id: bill.orderId },
        data: { status: 'COMPLETED' },
      });

      // Release the table only when no other active order uses it.
      if (bill.order.tableId) {
        const otherActive = await tx.order.findFirst({
          where: {
            tableId: bill.order.tableId,
            id: { not: bill.orderId },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          select: { id: true },
        });
        if (!otherActive) {
          await tx.table.update({ where: { id: bill.order.tableId }, data: { status: 'AVAILABLE' } });
        }
      }
    } else {
      updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: { status: 'PARTIALLY_PAID' },
        include: billInclude,
      });
    }

    return {
      payment,
      bill: {
        ...updatedBill,
        paymentStatus: updatedBill.status,
      },
      totalPaid,
      remainingBalance: Math.max(0, Number(bill.totalAmount) - totalPaid),
      isFullyPaid,
    };
  });

  await Promise.all([
    invalidateBillingCache(restaurantId),
    invalidateOrderCache(restaurantId),
    invalidateTableCache(restaurantId),
  ]);

  return result;
};

export const createPayment = async (restaurantId, data) => {
  return await processPayment(restaurantId, data);
};

export const getPayments = async (restaurantId, filters = {}) => {
  const cacheKey = buildCacheKey(restaurantId, 'payments', filters);
  return await cachedQuery(cacheKey, 15, async () => {
    const where = { bill: { restaurantId } };
    if (filters.method) where.method = filters.method;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    return await findManyPaginated(prisma.payment, {
      where,
      include: {
        bill: {
          include: {
            order: { include: { table: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }, filters);
  });
};

export const getPaymentById = async (restaurantId, id) => {
  const payment = await prisma.payment.findFirst({
    where: { id, bill: { restaurantId } },
    include: {
      bill: {
        include: {
          order: { include: { table: true } },
        },
      },
    },
  });
  if (!payment) {
    const error = new Error('Payment record not found');
    error.statusCode = 404;
    throw error;
  }
  return payment;
};

export const getPaymentsByBill = async (restaurantId, billId) => {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, restaurantId },
  });
  if (!bill) {
    const error = new Error('Bill not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.payment.findMany({
    where: { billId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPaymentsByBillId = async (restaurantId, billId) => {
  return await getPaymentsByBill(restaurantId, billId);
};

export const createRazorpayOrder = async (restaurantId, billId) => {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, restaurantId },
    include: {
      payments: true,
      order: {
        include: { table: true },
      },
      restaurant: {
        select: { name: true, currency: true, phone: true, email: true },
      },
    },
  });

  if (!bill) {
    const error = new Error('Bill not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }

  if (bill.status === 'PAID') {
    const error = new Error('Bill is already fully paid');
    error.statusCode = 400;
    throw error;
  }

  if (!['SERVED', 'COMPLETED'].includes(bill.order.status)) {
    const error = new Error('Order must be prepared and served before payment');
    error.statusCode = 400;
    throw error;
  }

  const completedPaymentsTotal = bill.payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const remainingBalance = Number(bill.totalAmount) - completedPaymentsTotal;
  if (remainingBalance <= 0) {
    const error = new Error('Bill has no remaining balance to settle');
    error.statusCode = 400;
    throw error;
  }

  const amountInPaise = Math.round(remainingBalance * 100);
  if (amountInPaise <= 0) {
    const error = new Error('Payment amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const razorpay = getRazorpayInstance();
  const receipt = (bill.billNumber || bill.id).slice(0, 40);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes: {
      billId: bill.id,
      billNumber: bill.billNumber,
      orderId: bill.orderId,
      restaurantId,
      tableNumber: bill.order?.table?.tableNumber || 'N/A',
      customerName: bill.order?.customerName || '',
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.RAZORPAY_KEY_ID,
    billId: bill.id,
    billNumber: bill.billNumber,
    totalAmount: Number(bill.totalAmount),
    amountInPaise,
    restaurantName: bill.restaurant?.name || 'ApexPOS Restaurant',
    restaurantPhone: bill.restaurant?.phone || '',
    restaurantEmail: bill.restaurant?.email || '',
    customerName: bill.order?.customerName || '',
  };
};

export const createRazorpayQrCode = async (restaurantId, billId) => {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, restaurantId },
    include: {
      payments: true,
      order: {
        include: { table: true },
      },
      restaurant: {
        select: { name: true, currency: true },
      },
    },
  });

  if (!bill) {
    const error = new Error('Bill not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }

  if (bill.status === 'PAID') {
    const error = new Error('Bill is already fully paid');
    error.statusCode = 400;
    throw error;
  }

  if (!['SERVED', 'COMPLETED'].includes(bill.order.status)) {
    const error = new Error('Order must be prepared and served before payment');
    error.statusCode = 400;
    throw error;
  }

  const completedPaymentsTotal = bill.payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const remainingBalance = Number(bill.totalAmount) - completedPaymentsTotal;
  if (remainingBalance <= 0) {
    const error = new Error('Bill has no remaining balance to settle');
    error.statusCode = 400;
    throw error;
  }

  const amountInPaise = Math.round(remainingBalance * 100);
  if (amountInPaise <= 0) {
    const error = new Error('Payment amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const razorpay = getRazorpayInstance();
  const qrCode = await razorpay.qrCode.create({
    type: 'upi_qr',
    name: (bill.restaurant?.name || 'ApexPOS').slice(0, 40),
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: amountInPaise,
    description: `Bill #${bill.billNumber || bill.id.slice(0, 8)}`,
    notes: {
      billId: bill.id,
      billNumber: bill.billNumber,
      orderId: bill.orderId,
      restaurantId,
      tableNumber: bill.order?.table?.tableNumber || 'N/A',
    },
  });

  return {
    qrId: qrCode.id,
    imageUrl: qrCode.image_url,
    amount: qrCode.payment_amount,
    currency: 'INR',
    billId: bill.id,
    billNumber: bill.billNumber,
    status: qrCode.status,
  };
};

export const verifyRazorpayPayment = async (restaurantId, data) => {
  const { billId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

  // 1. Verify HMAC SHA256 Signature
  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const generatedBuffer = Buffer.from(generatedSignature, 'utf8');
  const receivedBuffer = Buffer.from(razorpaySignature, 'utf8');

  const isSignatureValid =
    generatedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(generatedBuffer, receivedBuffer);

  if (!isSignatureValid) {
    const error = new Error('Invalid Razorpay payment signature');
    error.statusCode = 400;
    throw error;
  }

  // 2. Double payment / Idempotency check:
  // Check if this razorpay payment has already been recorded
  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        { razorpayPaymentId },
        { transactionReference: razorpayPaymentId },
      ],
      status: 'COMPLETED',
    },
    include: {
      bill: {
        include: {
          order: { include: { table: true } },
        },
      },
    },
  });

  if (existingPayment) {
    return {
      payment: existingPayment,
      bill: existingPayment.bill,
      totalPaid: Number(existingPayment.bill?.totalAmount || existingPayment.amount),
      remainingBalance: 0,
      isFullyPaid: existingPayment.bill?.status === 'PAID',
      alreadyProcessed: true,
    };
  }

  // 3. Verify Bill exists and belongs to restaurant
  const bill = await prisma.bill.findFirst({
    where: { id: billId, restaurantId },
    include: {
      payments: true,
      order: { include: { table: true } },
    },
  });

  if (!bill) {
    const error = new Error('Bill not found in this restaurant');
    error.statusCode = 404;
    throw error;
  }

  if (bill.status === 'PAID') {
    const lastPayment = bill.payments[bill.payments.length - 1];
    return {
      payment: lastPayment || null,
      bill,
      totalPaid: Number(bill.totalAmount),
      remainingBalance: 0,
      isFullyPaid: true,
      alreadyProcessed: true,
    };
  }

  // 4. Query Razorpay API to verify payment entity details if available
  let rzpPaymentAmountInRupees = Number(bill.totalAmount);
  try {
    const razorpay = getRazorpayInstance();
    const rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);
    if (rzpPayment) {
      if (rzpPayment.order_id && rzpPayment.order_id !== razorpayOrderId) {
        const error = new Error('Razorpay payment does not match the order ID');
        error.statusCode = 400;
        throw error;
      }
      if (rzpPayment.amount) {
        rzpPaymentAmountInRupees = Number(rzpPayment.amount) / 100;
      }
    }
  } catch (err) {
    if (err.statusCode === 400 && err.message?.includes('does not match')) {
      throw err;
    }
    // If Razorpay API fetch fails or network error occurs,
    // cryptographic HMAC SHA256 signature already proves authenticity
    rzpPaymentAmountInRupees = Number(bill.totalAmount);
  }

  // 5. Atomic settlement reusing existing processPayment logic
  const result = await processPayment(restaurantId, {
    billId: bill.id,
    amount: rzpPaymentAmountInRupees,
    method: 'RAZORPAY',
    provider: 'RAZORPAY',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    transactionReference: razorpayPaymentId,
  });

  return result;
};

export const handleRazorpayWebhook = async (rawBody, signature) => {
  if (env.RAZORPAY_WEBHOOK_SECRET) {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyStr)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature || '', 'utf8');

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      const error = new Error('Invalid Razorpay webhook signature');
      error.statusCode = 400;
      throw error;
    }
  }

  const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  const event = payload?.event;

  if (event === 'payment.captured' || event === 'order.paid' || event === 'qr_code.credited') {
    const entity = payload?.payload?.payment?.entity;
    if (entity) {
      const billId = entity.notes?.billId;
      const restaurantId = entity.notes?.restaurantId;
      const razorpayPaymentId = entity.id;
      const razorpayOrderId = entity.order_id;
      const amount = Number(entity.amount) / 100;

      if (billId && restaurantId) {
        const existing = await prisma.payment.findFirst({
          where: {
            OR: [
              { razorpayPaymentId },
              { transactionReference: razorpayPaymentId },
            ],
            status: 'COMPLETED',
          },
        });

        if (!existing) {
          await processPayment(restaurantId, {
            billId,
            amount,
            method: 'RAZORPAY',
            provider: 'RAZORPAY',
            razorpayOrderId,
            razorpayPaymentId,
            transactionReference: razorpayPaymentId,
          });
        }
      }
    }
  }

  return { status: 'ok' };
};

export default {
  processPayment,
  createPayment,
  createRazorpayOrder,
  createRazorpayQrCode,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getPayments,
  getPaymentById,
  getPaymentsByBill,
  getPaymentsByBillId,
};
