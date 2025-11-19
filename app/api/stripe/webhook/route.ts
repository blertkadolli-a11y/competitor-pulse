import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to your environment variables.' },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id || 'basic';

        if (userId && session.subscription) {
          // Get subscription details from Stripe
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          // Ensure we have a Subscription object, not a Response
          const subscription: Stripe.Subscription = subscriptionResponse as Stripe.Subscription;

          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, stripe_customer_id')
            .eq('auth_user_id', userId)
            .single();

          if (profile && subscription) {
            const customerId = typeof subscription.customer === 'string' 
              ? subscription.customer 
              : (subscription.customer as Stripe.Customer).id;

            // Update profile
            await supabase
              .from('profiles')
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: customerId,
                subscription_status: 'active',
              })
              .eq('id', profile.id);

            // Create or update subscription record
            const { data: existingSubscription } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('stripe_subscription_id', subscription.id)
              .maybeSingle();

            // Access subscription period dates safely (TypeScript types may be incomplete)
            const sub = subscription as any;
            const subscriptionData = {
              user_id: profile.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              plan_type: planId,
              status: subscription.status === 'active' ? 'active' : subscription.status,
              current_period_start: new Date((sub.current_period_start as number) * 1000).toISOString(),
              current_period_end: new Date((sub.current_period_end as number) * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end || false,
            };

            if (existingSubscription) {
              await supabase
                .from('subscriptions')
                .update(subscriptionData)
                .eq('id', existingSubscription.id);
            } else {
              await supabase
                .from('subscriptions')
                .insert(subscriptionData);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Determine plan type from subscription items or metadata
          const planType = subscription.items.data[0]?.price?.metadata?.plan_type 
            || subscription.metadata?.plan_type 
            || 'basic';

          // Update profile
          await supabase
            .from('profiles')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status === 'active' ? 'active' : 'canceled',
            })
            .eq('id', profile.id);

          // Update subscription record
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle();

          // Access subscription period dates safely (TypeScript types may be incomplete)
          const sub = subscription as any;
          const subscriptionData = {
            user_id: profile.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            plan_type: planType,
            status: subscription.status,
            current_period_start: new Date((sub.current_period_start as number) * 1000).toISOString(),
            current_period_end: new Date((sub.current_period_end as number) * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            canceled_at: sub.canceled_at
              ? new Date((sub.canceled_at as number) * 1000).toISOString()
              : null,
          };

          if (existingSubscription) {
            await supabase
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSubscription.id);
          } else {
            await supabase
              .from('subscriptions')
              .insert(subscriptionData);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Update profile
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
            })
            .eq('id', profile.id);

          // Update subscription record
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

