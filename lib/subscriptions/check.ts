/**
 * Subscription checking utilities
 */

import { supabase } from '@/lib/supabase/client';
import { getPlan, type PlanType } from './plans';

export interface SubscriptionInfo {
  planType: PlanType;
  status: string;
  competitorLimit: number;
  currentCount: number;
  canAddMore: boolean;
  currentPeriodEnd?: string;
}

/**
 * Get current user's subscription info
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!profile) return null;

    // Get active subscription (may not exist if table doesn't exist or no subscription)
    let subscription = null;
    try {
      const { data, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('plan_type, status, current_period_end')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If table doesn't exist (PGRST116) or no rows found, that's fine
      if (!subscriptionError || subscriptionError.code === 'PGRST116') {
        subscription = data;
      } else {
        console.warn('Error fetching subscription:', subscriptionError);
      }
    } catch (err) {
      // Table might not exist yet, that's okay
      console.warn('Subscriptions table may not exist yet:', err);
    }

    // Get competitor count
    const { count } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    const planType: PlanType = subscription?.plan_type || 'free';
    const competitorLimit = getPlan(planType).competitorLimit;
    const currentCount = count || 0;

    return {
      planType,
      status: subscription?.status || 'inactive',
      competitorLimit,
      currentCount,
      canAddMore: competitorLimit === 0 ? false : currentCount < competitorLimit,
      currentPeriodEnd: subscription?.current_period_end,
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
}

/**
 * Check if user can add a competitor
 */
export async function canAddCompetitor(): Promise<{ allowed: boolean; reason?: string }> {
  const info = await getSubscriptionInfo();
  
  if (!info) {
    return {
      allowed: false,
      reason: 'Please sign in to add competitors',
    };
  }

  if (info.planType === 'free') {
    return {
      allowed: false,
      reason: 'Please upgrade to a paid plan to add competitors',
    };
  }

  if (!info.canAddMore) {
    return {
      allowed: false,
      reason: `You've reached your plan limit of ${info.competitorLimit} competitors. Please upgrade to add more.`,
    };
  }

  return { allowed: true };
}

