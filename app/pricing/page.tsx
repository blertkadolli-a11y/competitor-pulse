'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleGetStarted = async (planId: string) => {
    try {
      setLoading(planId);
      
      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/signup?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
        return;
      }

      // Get price ID based on plan and billing period
      const priceIdKey = isAnnual ? 'annual' : 'monthly';
      const priceIdMap: Record<string, Record<string, string>> = {
        basic: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY || '',
          annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL || '',
        },
        pro: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
          annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || '',
        },
        enterprise: {
          monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
          annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || '',
        },
      };

      const priceId = priceIdMap[planId]?.[priceIdKey];

      if (!priceId) {
        const missingVar = `NEXT_PUBLIC_STRIPE_PRICE_${planId.toUpperCase()}_${priceIdKey.toUpperCase()}`;
        alert(
          `Stripe price ID not configured.\n\n` +
          `Missing: ${missingVar}\n\n` +
          `Please add this to your .env.local file.\n` +
          `Get your Price IDs from: https://dashboard.stripe.com/products\n\n` +
          `After adding, restart your dev server.`
        );
        console.error(`Missing Stripe price ID: ${missingVar}`);
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, planId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create checkout session';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { sessionId, url, error } = await response.json();

      if (error || !sessionId) {
        throw new Error(error || 'Failed to create checkout session');
      }

      // Use the new Stripe.js API - redirect directly to the checkout URL
      if (url) {
        window.location.href = url;
      } else {
        // Fallback: construct URL from sessionId if url is not provided
        throw new Error('Checkout session URL not available');
      }
    } catch (error: any) {
      console.error('Error starting checkout:', error);
      alert(error.message || 'Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: { monthly: 29, annual: 24 },
      description: 'Perfect for individuals and small teams',
      features: [
        'Track up to 10 competitors',
        'Daily website monitoring',
        'Change detection alerts',
        'AI summaries',
        'Daily email reports',
        '30-day history',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: { monthly: 99, annual: 79 },
      description: 'For growing businesses',
      features: [
        'Track up to 30 competitors',
        'Daily website monitoring',
        'Advanced change detection',
        'AI summaries & insights',
        'Daily & weekly email reports',
        '90-day history',
        'Priority support',
      ],
      cta: 'Get Started',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 299, annual: 249 },
      description: 'For large organizations',
      features: [
        'Track up to 100 competitors',
        'Real-time monitoring',
        'Advanced analytics',
        'Custom AI reports',
        'Unlimited history',
        'Dedicated support',
        'SLA guarantee',
      ],
      cta: 'Get Started',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-semibold neon-text">
              SpectraTrack
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-[var(--muted-foreground)] mb-8">
            Choose the plan that's right for you
          </p>
          <div className="flex items-center justify-center space-x-4">
            <span className={!isAnnual ? 'font-medium' : 'text-[var(--muted-foreground)]'}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-[var(--primary)] transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[var(--primary-foreground)] transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={isAnnual ? 'font-medium' : 'text-[var(--muted-foreground)]'}>
              Annual
              <span className="ml-2 text-sm text-green-600">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = isAnnual ? plan.price.annual : plan.price.monthly;
            return (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-2 border-[var(--primary)] relative' : ''}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-[var(--muted-foreground)] mb-4">{plan.description}</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-[var(--muted-foreground)] ml-2">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? 'default' : 'secondary'}
                  className="w-full"
                  onClick={() => handleGetStarted(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? 'Loading...' : plan.cta}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[var(--muted-foreground)] mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Questions? <Link href="/dashboard/settings" className="text-[var(--primary)] hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

