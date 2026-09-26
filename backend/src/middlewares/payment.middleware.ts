import { Request, Response, NextFunction } from "express";
import { ApiError } from '../utils/ApiError.js';
import { getPlanByType, normalizePlanType } from '../config/paymentPlans.js';

// Middleware to validate payment data
export const validatePaymentData = (req: Request, res: Response, next: NextFunction) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planType
  } = req.body;

  // Validate required fields
  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    throw new ApiError(400, 'Valid razorpay_order_id is required');
  }

  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    throw new ApiError(400, 'Valid razorpay_payment_id is required');
  }

  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    throw new ApiError(400, 'Valid razorpay_signature is required');
  }

  if (!planType || typeof planType !== 'string') {
    throw new ApiError(400, 'Valid planType is required');
  }

  // Validate Razorpay ID formats (basic validation)
  const orderIdPattern = /^order_[A-Za-z0-9]+$/;
  const paymentIdPattern = /^pay_[A-Za-z0-9]+$/;

  if (!orderIdPattern.test(razorpay_order_id)) {
    throw new ApiError(400, 'Invalid order ID format');
  }

  if (!paymentIdPattern.test(razorpay_payment_id)) {
    throw new ApiError(400, 'Invalid payment ID format');
  }

  // Validate signature format (should be hex string)
  const signaturePattern = /^[a-f0-9]+$/i;
  if (!signaturePattern.test(razorpay_signature)) {
    throw new ApiError(400, 'Invalid signature format');
  }

  // Validate plan type
  const normalizedPlan: any = getPlanByType(normalizePlanType(planType));
  if (!normalizedPlan || !normalizedPlan.requiresPayment) {
    throw new ApiError(400, 'Invalid plan type');
  }

  next();
};
