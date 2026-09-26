import { DEFAULT_PLAN_ID, PAYMENT_PLANS, isAuthorizedDeveloperEmail } from '../config/paymentPlans.js';

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_BILLING_PERIOD_DAYS: Record<string, number> = Object.freeze({
  month: 30,
  week: 7,
  year: 365
});

export const resolveDurationInDays = (planOrDuration: any): number | null => {
  if (!planOrDuration) return null;

  if (typeof planOrDuration === 'number') {
    return planOrDuration;
  }

  if (typeof planOrDuration.durationInDays === 'number') {
    return planOrDuration.durationInDays;
  }

  if (planOrDuration.billingPeriod && DEFAULT_BILLING_PERIOD_DAYS[planOrDuration.billingPeriod]) {
    return DEFAULT_BILLING_PERIOD_DAYS[planOrDuration.billingPeriod];
  }

  return null;
};

export const calculatePlanExpiry = (activationDate: any, planOrDuration: any): Date | null => {
  if (!activationDate) return null;

  const durationInDays = resolveDurationInDays(planOrDuration);
  if (!durationInDays) return null;

  return new Date(new Date(activationDate).getTime() + durationInDays * DAY_IN_MS);
};

export const getRenewalReminderDate = (expiresAt: any, reminderDays: number = 2): Date | null => {
  if (!expiresAt) return null;
  return new Date(new Date(expiresAt).getTime() - reminderDays * DAY_IN_MS);
};

export interface IsReminderDueParams {
  expiresAt: any;
  reminderDays?: number;
  now?: Date;
}

export const isReminderDue = ({ expiresAt, reminderDays = 2, now = new Date() }: IsReminderDueParams): boolean => {
  if (!expiresAt) return false;
  const reminderDate = getRenewalReminderDate(expiresAt, reminderDays);
  if (!reminderDate) return false;
  const expiryDate = new Date(expiresAt);
  return now >= reminderDate && now < expiryDate;
};

export const getDaysUntilExpiry = (expiresAt: any, now = new Date()): number | null => {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  const diff = expiryDate.getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / DAY_IN_MS);
};

export const FALLBACK_DURATION_DAYS = 30;

export const enforceSubscriptionFreshness = async (userDoc: any) => {
  if (!userDoc) return userDoc;

  const isDev = isAuthorizedDeveloperEmail(userDoc.email);

  // If user is on the TESTING plan, ensure they are strictly an authorized developer
  if (userDoc.planId === 'TESTING') {
    if (!isDev) {
      // Security: Strip TESTING plan from unauthorized users
      userDoc.planId = DEFAULT_PLAN_ID;
      userDoc.isPaidUser = false;
      userDoc.planName = 'Free';
      userDoc.planActivatedAt = null;
      userDoc.planExpiresAt = null;
      await userDoc.save();
      return userDoc;
    }

    // Authorized developer testing account: ensure paid status and no expiration
    if (!userDoc.isPaidUser || userDoc.planName !== PAYMENT_PLANS.TESTING.name || userDoc.planExpiresAt !== null) {
      userDoc.isPaidUser = true;
      userDoc.planName = PAYMENT_PLANS.TESTING.name;
      userDoc.planActivatedAt = userDoc.planActivatedAt || new Date();
      userDoc.planExpiresAt = null;
      await userDoc.save();
    }
    return userDoc;
  }

  // Automatically activate TESTING plan for the authorized developer account if they are on default/free tier
  if (isDev && (!userDoc.isPaidUser || userDoc.planId === DEFAULT_PLAN_ID)) {
    userDoc.planId = 'TESTING';
    userDoc.planName = PAYMENT_PLANS.TESTING.name;
    userDoc.isPaidUser = true;
    userDoc.planActivatedAt = userDoc.planActivatedAt || new Date();
    userDoc.planExpiresAt = null;
    await userDoc.save();
    return userDoc;
  }

  if (!userDoc.isPaidUser) {
    if (!userDoc.planId || !(PAYMENT_PLANS as any)[userDoc.planId]) {
      userDoc.planId = DEFAULT_PLAN_ID;
      await userDoc.save();
    }
    return userDoc;
  }

  let requireSave = false;

  if (!userDoc.planId || !(PAYMENT_PLANS as any)[userDoc.planId]) {
    userDoc.planId = DEFAULT_PLAN_ID;
    requireSave = true;
  }

  if (!userDoc.planActivatedAt && userDoc.paymentInfo?.paymentDate) {
    userDoc.planActivatedAt = userDoc.paymentInfo.paymentDate;
    requireSave = true;
  }

  if (!userDoc.planExpiresAt && userDoc.planActivatedAt) {
    userDoc.planExpiresAt = calculatePlanExpiry(userDoc.planActivatedAt, FALLBACK_DURATION_DAYS);
    requireSave = true;
  }

  if (!userDoc.planExpiresAt && userDoc.paymentInfo?.paymentDate) {
    userDoc.planExpiresAt = calculatePlanExpiry(userDoc.paymentInfo.paymentDate, FALLBACK_DURATION_DAYS);
    requireSave = true;
  }

  if (!userDoc.planExpiresAt) {
    if (requireSave) {
      await userDoc.save();
    }
    return userDoc;
  }

  const expiryDate = new Date(userDoc.planExpiresAt);
  if (expiryDate > new Date()) {
    if (requireSave) {
      await userDoc.save();
    }
    return userDoc;
  }

  userDoc.isPaidUser = false;
  userDoc.planName = 'Free';
  userDoc.planId = DEFAULT_PLAN_ID;
  userDoc.planActivatedAt = null;
  userDoc.planExpiresAt = null;

  await userDoc.save();

  return userDoc;
};
