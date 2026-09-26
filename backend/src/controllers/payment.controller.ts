import crypto from "crypto";
import { Request, Response } from "express";
import { razorpayInstance } from "../config/razorpay-client.js";
import UserModel from "../models/User.model.js";
import {
  PAYMENT_PLANS,
  getPlanByType,
  normalizePlanType
} from "../config/paymentPlans.js";
import {
  calculatePlanExpiry,
  getRenewalReminderDate,
  getDaysUntilExpiry,
  isReminderDue
} from "../utils/subscription.js";

const REMINDER_WINDOW_DAYS = 2;

// Create Order
const createOrder = async (req: Request, res: Response) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    const { planType } = req.body;
    const userId = req.user?._id;
    const plan = getPlanByType(planType);

    if (!plan || !plan.requiresPayment) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unsupported plan type for payment",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isPaidUser && user.planName && user.planName !== "Free") {
      return res.status(400).json({
        success: false,
        message: "User already has an active subscription",
      });
    }

    const orderOptions = {
      amount: plan.amount,
      currency: plan.currency,
      receipt: `o${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planType: plan.id,
        userEmail: user.email,
        username: user.username
      }
    };

    const razorpayOrder = await (razorpayInstance.orders as any).create(orderOptions);

    if (!razorpayOrder?.id) {
      return res.status(500).json({
        success: false,
        message: "Failed to create Razorpay order",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: razorpayOrder.id,
        amount: plan.amount,
        amountMajor: plan.amount / 100,
        amountInRupees: plan.amount / 100, // legacy alias for major units
        currency: plan.currency,
        key: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        planType: plan.id,
        planDescription: plan.description,
        userEmail: user.email,
        username: user.username,
      }
    });

  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

// Verify Payment
const verifyPayment = async (req: Request, res: Response) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType
    } = req.body;
    const userId = req.user?._id;
    const plan = getPlanByType(planType);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment details",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!plan || !plan.requiresPayment) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    let paymentDetails: any;
    try {
      paymentDetails = await (razorpayInstance.payments as any).fetch(razorpay_payment_id);
    } catch (razorpayError) {
      console.error("Razorpay fetch error:", razorpayError);
      return res.status(500).json({
        success: false,
        message: "Failed to verify payment with Razorpay",
      });
    }

    if (paymentDetails.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed successfully",
      });
    }

    if (paymentDetails.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Payment/order mismatch detected",
      });
    }

    if (paymentDetails.amount !== plan.amount || paymentDetails.currency !== plan.currency) {
      return res.status(400).json({
        success: false,
        message: "Payment details do not match plan configuration",
      });
    }

    let orderDetails: any;
    try {
      orderDetails = await (razorpayInstance.orders as any).fetch(razorpay_order_id);
    } catch (razorpayError) {
      console.error("Razorpay order fetch error:", razorpayError);
      return res.status(500).json({
        success: false,
        message: "Failed to verify order with Razorpay",
      });
    }

    if (orderDetails.amount !== plan.amount || orderDetails.currency !== plan.currency) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    if (!orderDetails?.notes?.userId || orderDetails.notes.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Order does not belong to the authenticated user",
      });
    }

    if (!orderDetails?.notes?.planType || normalizePlanType(orderDetails.notes.planType) !== plan.id) {
      return res.status(400).json({
        success: false,
        message: "Plan mismatch detected for this order",
      });
    }

    const planActivatedAt = new Date();
    const planExpiresAt = calculatePlanExpiry(planActivatedAt, plan);

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          isPaidUser: true,
          planId: plan.id,
          planName: plan.name,
          planActivatedAt,
          planExpiresAt,
          paymentInfo: {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentDate: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        user: {
          _id: updatedUser._id,
          id: updatedUser._id, 
          email: updatedUser.email,
          username: updatedUser.username,
          isPaidUser: updatedUser.isPaidUser,
          planName: updatedUser.planName,
          paymentDate: updatedUser.paymentInfo?.paymentDate,
          planActivatedAt: updatedUser.planActivatedAt,
          planExpiresAt: updatedUser.planExpiresAt
        },
        paymentId: razorpay_payment_id,
        planName: plan.name
      }
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

// Get Payment Plans
const getPaymentPlans = async (_req: Request, res: Response) => {
  try {
    const plans = Object.values(PAYMENT_PLANS)
      .filter((plan) => !plan.hidden)
      .map((plan) => ({
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      amountMajor: plan.amount / 100,
      amountInRupees: plan.amount / 100, // legacy alias for major units
      currency: plan.currency,
      description: plan.description,
      features: plan.features,
      billingPeriod: plan.billingPeriod,
      limits: (plan as any).limits || null,
      requiresPayment: plan.requiresPayment,
      isCustom: Boolean(plan.isCustom),
      contactHref: plan.contactHref || null,
      contactEmail: plan.contactEmail || null,
      buttonText: plan.buttonText,
      popular: plan.popular
    }));

    return res.status(200).json({
      success: true,
      message: "Payment plans retrieved successfully",
      data: plans
    });
  } catch (error) {
    console.error("Get payment plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment plans",
    });
  }
};

// Get Payment History
const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user: any = await UserModel.findById(userId)
      .select("isPaidUser planName paymentInfo createdAt planActivatedAt planExpiresAt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const paymentHistory = {
      isPaidUser: user.isPaidUser,
      currentPlan: user.planName,
      paymentInfo: user.paymentInfo || null,
      memberSince: user.createdAt,
      planActivatedAt: user.planActivatedAt || null,
      planExpiresAt: user.planExpiresAt || null,
      renewalReminderDate: getRenewalReminderDate(user.planExpiresAt, REMINDER_WINDOW_DAYS),
      daysUntilExpiry: getDaysUntilExpiry(user.planExpiresAt),
      reminderWindowInDays: REMINDER_WINDOW_DAYS,
      isRenewalReminderDue: isReminderDue({
        expiresAt: user.planExpiresAt,
        reminderDays: REMINDER_WINDOW_DAYS
      })
    };

    return res.status(200).json({
      success: true,
      message: "Payment history retrieved successfully",
      data: paymentHistory
    });

  } catch (error) {
    console.error("Get payment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment history",
    });
  }
};

// Handle Payment Failure
const handlePaymentFailure = async (req: Request, res: Response) => {
  try {
    const { error, orderId } = req.body;
    const userId = req.user?._id;
    const failureReason = typeof error === "string" ? error : error?.description || "Unknown error";

    console.error("Payment failed:", {
      userId,
      orderId,
      error: failureReason
    });

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      data: { orderId }
    });

  } catch (err) {
    console.error("Handle payment failure error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to handle payment failure",
    });
  }
};

// Razorpay Webhook Handler
const handleWebhook = async (req: Request, res: Response) => {
  try {
    if (!razorpayInstance) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured",
      });
    }

    const webhookSignature = req.headers["x-razorpay-signature"] as string | undefined;
    
    // Use rawBody for signature verification (original string)
    const webhookBody = req.rawBody || JSON.stringify(req.body);

    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: "Missing webhook signature",
      });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET as string)
      .update(webhookBody)
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      console.error("Webhook signature verification failed");
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    // Body is already parsed by middleware
    const body = req.body;
    const event = body.event;
    const paymentEntity = body.payload?.payment?.entity;

    // Handle payment.captured event
    if (event === "payment.captured" && paymentEntity) {
      const {
        id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount,
        status
      } = paymentEntity;

      if (status !== "captured") {
        return res.status(200).json({
          success: true,
          message: "Payment not captured, ignoring webhook",
        });
      }

      try {
        // Fetch order details to get user and plan info
        const orderDetails = await (razorpayInstance.orders as any).fetch(razorpay_order_id);
        const userId = orderDetails?.notes?.userId;

        if (!userId) {
          console.error("Webhook: No userId found in order notes");
          return res.status(200).json({
            success: true,
            message: "Order processed but no user ID found",
          });
        }

        const planType = orderDetails?.notes?.planType;
        const plan = getPlanByType(planType);

        if (!plan || !plan.requiresPayment) {
          console.error("Webhook: Invalid plan type", planType);
          return res.status(200).json({
            success: true,
            message: "Invalid plan type in order",
          });
        }

        // Verify amount matches
        if (amount !== plan.amount) {
          console.error("Webhook: Amount mismatch", { received: amount, expected: plan.amount });
          return res.status(200).json({
            success: true,
            message: "Amount mismatch, ignoring webhook",
          });
        }

        // Check if payment already processed
        const user = await UserModel.findById(userId);
        if (!user) {
          console.error("Webhook: User not found", userId);
          return res.status(200).json({
            success: true,
            message: "User not found",
          });
        }

        // Only update if payment not already processed
        if (user.paymentInfo?.razorpay_payment_id === razorpay_payment_id) {
          return res.status(200).json({
            success: true,
            message: "Payment already processed",
          });
        }

        // Update user subscription
        const planActivatedAt = new Date();
        const planExpiresAt = calculatePlanExpiry(planActivatedAt, plan);

        await UserModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              isPaidUser: true,
              planId: plan.id,
              planName: plan.name,
              planActivatedAt,
              planExpiresAt,
              paymentInfo: {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature: webhookSignature, // Store webhook signature
                paymentDate: new Date()
              }
            }
          },
          { new: true, runValidators: true }
        );

        console.log("Webhook: Payment processed successfully", {
          userId,
          paymentId: razorpay_payment_id,
          planType: plan.id
        });

        return res.status(200).json({
          success: true,
          message: "Webhook processed successfully",
        });
      } catch (error) {
        console.error("Webhook processing error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to process webhook",
        });
      }
    }

    // Handle other events (payment.failed, etc.)
    if (event === "payment.failed") {
      console.log("Webhook: Payment failed", paymentEntity?.id);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });

  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

export {
  createOrder,
  verifyPayment,
  getPaymentPlans,
  getPaymentHistory,
  handlePaymentFailure,
  handleWebhook
};
