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

    const { priceId, planId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Get or create Stripe customer
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });

        customerId = customer.id;

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', profile.id);
      } catch (stripeError: any) {
        console.error('Stripe error creating customer:', stripeError);
        if (stripeError.type === 'StripeAuthenticationError' || stripeError.message?.includes('Invalid API Key')) {
          return NextResponse.json(
            { error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local and restart the server.' },
            { status: 500 }
          );
        }
        throw stripeError;
      }
    }

    try {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId || 'unknown',
        },
      });

        return NextResponse.json({ 
          sessionId: session.id,
          url: session.url 
        });
    } catch (stripeError: any) {
      console.error('Stripe error creating checkout session:', stripeError);
      if (stripeError.type === 'StripeAuthenticationError' || stripeError.message?.includes('Invalid API Key')) {
        return NextResponse.json(
          { error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local and restart the server.' },
          { status: 500 }
        );
      }
      throw stripeError;
    }
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

