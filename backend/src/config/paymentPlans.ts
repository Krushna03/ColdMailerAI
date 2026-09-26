export const DEFAULT_PLAN_ID = 'GETSTARTED';
export const ENTERPRISE_CONTACT_EMAIL = 'krushnasakhare965@gmail.com';

export interface PlanLimits {
  monthlyEmailGenerations: number | null;
  maxRegenerationsPerEmail: number | null;
  maxBatchSize: number | null;
}

export interface PaymentPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  description: string;
  features: string[];
  billingPeriod: string;
  durationInDays: number | null;
  requiresPayment: boolean;
  isCustom: boolean;
  hidden?: boolean;
  buttonText: string;
  popular: boolean;
  contactEmail?: string;
  contactHref?: string;
  limits: PlanLimits;
}

export const PAYMENT_PLANS: Record<string, PaymentPlan> = Object.freeze({
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
  },
  TESTING: {
    id: 'TESTING',
    name: 'Developer Testing Plan',
    amount: 0,
    currency: 'USD',
    description: 'Internal testing tier with completely bypassed limits for developer testing',
    features: [
      'Unlimited monthly email generations',
      'Unlimited revisions & iterations',
      'Unlimited batch generation size',
      'Developer bypass active'
    ],
    billingPeriod: 'forever',
    durationInDays: null,
    requiresPayment: false,
    isCustom: true,
    hidden: true, // Hidden from public pricing and non-developer endpoints
    buttonText: 'Developer Plan Active',
    popular: false,
    limits: Object.freeze({
      monthlyEmailGenerations: null, // Unlimited
      maxRegenerationsPerEmail: null, // Unlimited
      maxBatchSize: null             // Unlimited
    })
  }
});

export const normalizePlanType = (planType = '') => planType.trim().toUpperCase();

export const getPlanByType = (planType = ''): PaymentPlan | null => {
  if (!planType) return null;
  return PAYMENT_PLANS[normalizePlanType(planType)] || null;
};

export const PAYABLE_PLAN_IDS = Object.freeze(
  Object.keys(PAYMENT_PLANS).filter(
    (planType) => PAYMENT_PLANS[planType].requiresPayment
  )
);

export const getAuthorizedDeveloperEmails = (): string[] => {
  const envEmail = process.env.TEST_ACCOUNT_EMAIL || process.env.DEVELOPER_EMAIL || '';
  const list = [
    envEmail,
    ENTERPRISE_CONTACT_EMAIL,
    'krushnasakhare965@gmail.com'
  ];
  return list
    .flatMap((e) => e.split(','))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

export const isAuthorizedDeveloperEmail = (email?: string): boolean => {
  if (!email) return false;
  const authorized = getAuthorizedDeveloperEmails();
  return authorized.includes(email.trim().toLowerCase());
};
