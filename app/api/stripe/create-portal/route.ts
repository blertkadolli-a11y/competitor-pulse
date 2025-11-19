import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe/server';

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // If no Stripe customer ID, create one first
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      try {
        // Create a Stripe customer for this user
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            supabase_user_id: user.id,
          },
        });

        customerId = customer.id;

        // Save customer ID to profile
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', profile.id);
      } catch (stripeError: any) {
        console.error('Stripe error creating customer:', stripeError);
        if (stripeError.type === 'StripeAuthenticationError') {
          return NextResponse.json(
            { error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local' },
            { status: 500 }
          );
        }
        throw stripeError;
      }
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
      });

      return NextResponse.json({ url: session.url });
    } catch (stripeError: any) {
      console.error('Stripe error creating portal session:', stripeError);
      if (stripeError.type === 'StripeAuthenticationError') {
        return NextResponse.json(
          { error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local' },
          { status: 500 }
        );
      }
      throw stripeError;
    }

  } catch (error: any) {
    console.error('Error creating portal session:', error);
    
    // Handle Stripe authentication errors specifically
    if (error.type === 'StripeAuthenticationError' || error.message?.includes('Invalid API Key')) {
      return NextResponse.json(
        { error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local and restart the server.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

