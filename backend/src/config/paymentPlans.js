const DEFAULT_PLAN_ID = 'GETSTARTED';
const ENTERPRISE_CONTACT_EMAIL = 'krushnasakhare965@gmail.com';

const PAYMENT_PLANS = Object.freeze({
  GETSTARTED: {
    id: 'GETSTARTED',
    name: 'Starter Plan',
    amount: 0,
    currency: 'INR',
    description: 'Perfect for trying AI-powered email generation',
    features: [
      '50 emails per month',
      'Basic email templates',
      'Standard tone options',
      'Copy & export functionality'
    ],
    billingPeriod: 'forever',
    durationInDays: null,
    requiresPayment: false,
    isCustom: false,
    buttonText: 'Get Started',
    popular: false,
    limits: Object.freeze({
      monthlyEmailGenerations: 10,
      maxRegenerationsPerEmail: 1,
      maxBatchSize: 10
    })
  },
  STARTFREETRIAL: {
    id: 'STARTFREETRIAL',
    name: 'Professional Plan',
    amount: 1500, // $15.00 in cents
    currency: 'USD',
    description: 'Ideal for freelancers and founders running real outreach',
    features: [
      '100 emails per month',
      '3 revisions per email',
      'Advanced personalization',
      'Leads & batch generation',
      'Priority email support'
    ],
    billingPeriod: 'month',
    durationInDays: 30,
    requiresPayment: true,
    isCustom: false,
    buttonText: 'Upgrade to Pro',
    popular: true,
    limits: Object.freeze({
      monthlyEmailGenerations: 100,
      maxRegenerationsPerEmail: 3,
      maxBatchSize: 50
    })
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Plan',
    amount: 0,
    currency: 'USD',
    description: 'Custom volume, support, and limits for teams and agencies',
    features: [
      'Custom monthly email volume',
      'Higher revision limits',
      'Dedicated onboarding & support',
      'Priority generation capacity',
      'Custom terms for teams'
    ],
    billingPeriod: 'custom',
    durationInDays: null,
    requiresPayment: false,
    isCustom: true,
    buttonText: 'Contact sales',
    popular: false,
    contactEmail: ENTERPRISE_CONTACT_EMAIL,
    contactHref: `mailto:${ENTERPRISE_CONTACT_EMAIL}?subject=${encodeURIComponent('ColdMailer Enterprise Plan')}`,
    limits: Object.freeze({
      monthlyEmailGenerations: null,
      maxRegenerationsPerEmail: null,
      maxBatchSize: null
    })
  }
});

const normalizePlanType = (planType = '') => planType.trim().toUpperCase();

const getPlanByType = (planType = '') => {
  if (!planType) return null;
  return PAYMENT_PLANS[normalizePlanType(planType)] || null;
};

const PAYABLE_PLAN_IDS = Object.freeze(
  Object.keys(PAYMENT_PLANS).filter(
    (planType) => PAYMENT_PLANS[planType].requiresPayment
  )
);

export {
  PAYMENT_PLANS,
  PAYABLE_PLAN_IDS,
  DEFAULT_PLAN_ID,
  ENTERPRISE_CONTACT_EMAIL,
  getPlanByType,
  normalizePlanType
};
