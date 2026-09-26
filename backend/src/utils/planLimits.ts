import { PAYMENT_PLANS, DEFAULT_PLAN_ID } from '../config/paymentPlans.js';
import { Email } from '../models/Email.model.js';

export const getPlanConfigById = (planId: string = DEFAULT_PLAN_ID) => {
  if (!planId) {
    return (PAYMENT_PLANS as any)[DEFAULT_PLAN_ID];
  }
  return (PAYMENT_PLANS as any)[planId] || (PAYMENT_PLANS as any)[DEFAULT_PLAN_ID];
};

export const getPlanConfigForUser = (userDoc: any = {}) => {
  if (!userDoc) {
    return (PAYMENT_PLANS as any)[DEFAULT_PLAN_ID];
  }
  return getPlanConfigById(userDoc.planId);
};

export const getMonthlyUsageWindow = (now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
};

export const getMonthlyEmailUsage = async ({ userId, now = new Date() }: { userId: any; now?: Date }) => {
  const { start, end } = getMonthlyUsageWindow(now);
  const used = await Email.countDocuments({
    userId,
    createdAt: { $gte: start, $lt: end }
  });

  return {
    used,
    windowStart: start,
    windowEnd: end
  };
};

export const buildPlanUsageSummary = async ({
  user,
  planConfig,
  now = new Date(),
  monthlyUsageSnapshot = null
}: {
  user: any;
  planConfig: any;
  now?: Date;
  monthlyUsageSnapshot?: any;
}) => {
  const usage =
    monthlyUsageSnapshot ||
    (await getMonthlyEmailUsage({ userId: user._id, now }));

  return {
    plan: {
      id: planConfig.id,
      name: planConfig.name,
      requiresPayment: planConfig.requiresPayment,
      description: planConfig.description
    },
    usage: {
      monthlyEmailGenerations: {
        ...usage,
        limit: planConfig?.limits?.monthlyEmailGenerations ?? null
      }
    },
    capabilities: {
      maxRegenerationsPerEmail:
        planConfig?.limits?.maxRegenerationsPerEmail ?? null
    }
  };
};
