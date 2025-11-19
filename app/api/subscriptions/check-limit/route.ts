import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPlan, type PlanType } from '@/lib/subscriptions/plans';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get active subscription (may not exist if table doesn't exist)
    let subscription = null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If table doesn't exist (PGRST116) or no rows, that's fine
      if (!error || error.code === 'PGRST116') {
        subscription = data;
      }
    } catch (err) {
      // Table might not exist yet, that's okay
      console.warn('Subscriptions table may not exist:', err);
    }

    // Get competitor count
    const { count } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    const planType: PlanType = subscription?.plan_type || 'free';
    const plan = getPlan(planType);
    const currentCount = count || 0;
    const canAddMore = plan.competitorLimit === 0 ? false : currentCount < plan.competitorLimit;

    return NextResponse.json({
      planType,
      status: subscription?.status || 'inactive',
      competitorLimit: plan.competitorLimit,
      currentCount,
      canAddMore,
    });
  } catch (error: any) {
    console.error('Error checking subscription limit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check subscription limit' },
      { status: 500 }
    );
  }
}

