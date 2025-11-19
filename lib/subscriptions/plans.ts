/**
 * Subscription plan definitions and limits
 */

export type PlanType = 'basic' | 'pro' | 'enterprise' | 'free';

export interface Plan {
  id: PlanType;
  name: string;
  competitorLimit: number;
  price: {
    monthly: number;
    annual: number;
  };
  stripePriceIds: {
    monthly: string;
    annual: string;
  };
  features: string[];
}

export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    competitorLimit: 0,
    price: {
      monthly: 0,
      annual: 0,
    },
    stripePriceIds: {
      monthly: '',
      annual: '',
    },
    features: [
      'No competitors allowed',
      'Upgrade to start tracking',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    competitorLimit: 10,
    price: {
      monthly: 29,
      annual: 24,
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL || '',
    },
    features: [
      'Track up to 10 competitors',
      'Daily website monitoring',
      'Change detection alerts',
      'AI summaries',
      'Daily email reports',
      '30-day history',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    competitorLimit: 30,
    price: {
      monthly: 99,
      annual: 79,
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || '',
    },
    features: [
      'Track up to 30 competitors',
      'Daily website monitoring',
      'Advanced change detection',
      'AI summaries & insights',
      'Daily & weekly email reports',
      '90-day history',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    competitorLimit: 100,
    price: {
      monthly: 299,
      annual: 249,
    },
    stripePriceIds: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || '',
    },
    features: [
      'Track up to 100 competitors',
      'Real-time monitoring',
      'Advanced analytics',
      'Custom AI reports',
      'Unlimited history',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
};

/**
 * Get plan by type
 */
export function getPlan(planType: PlanType): Plan {
  return PLANS[planType] || PLANS.free;
}

/**
 * Get competitor limit for a plan
 */
export function getCompetitorLimit(planType: PlanType): number {
  return getPlan(planType).competitorLimit;
}

/**
 * Check if user can add more competitors
 */
export function canAddCompetitor(currentCount: number, planType: PlanType): boolean {
  const limit = getCompetitorLimit(planType);
  return limit === 0 ? false : currentCount < limit;
}

