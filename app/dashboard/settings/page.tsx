'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { format } from 'date-fns';
import { getSubscriptionInfo } from '@/lib/subscriptions/check';
import { getPlan } from '@/lib/subscriptions/plans';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [emailFrequency, setEmailFrequency] = useState<'daily' | 'weekly' | 'off'>('weekly');

  useEffect(() => {
    fetchUserData();
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      // Set default free plan info if there's an error
      setSubscriptionInfo({
        planType: 'free',
        status: 'inactive',
        competitorLimit: 0,
        currentCount: 0,
        canAddMore: false,
      });
    }
  };

  const fetchUserData = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (profileData) {
        setUser(profileData);
        setEmailFrequency(profileData.email_frequency || 'weekly');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheckout = async (priceId: string) => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
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

      const { sessionId, url, error: responseError } = await response.json();
      if (responseError || !sessionId) {
        throw new Error(responseError || 'No session ID returned');
      }
      
      // Use the new Stripe.js API - redirect directly to the checkout URL
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Checkout session URL not available');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      alert(error.message || 'Failed to start checkout process');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create portal session';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No portal URL returned');
      }
      window.location.href = url;
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      alert(error.message || 'Failed to load subscription management');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to cancel subscription';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await fetchUserData();
      alert('Subscription canceled successfully');
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      alert(error.message || 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  // Show subscription management if user has Stripe customer ID or active subscription
  const hasStripeCustomer = !!user?.stripe_customer_id;
  const isSubscribed = user?.subscription_status === 'active' || user?.subscription_status === 'trialing' || hasStripeCustomer;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-[var(--muted-foreground)]">
          Manage your account and subscription
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Section */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <Input value={user?.name || ''} disabled />
            </div>
            {user?.created_at && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Member Since</label>
                <Input value={format(new Date(user.created_at), 'PP')} disabled />
              </div>
            )}
          </div>
        </Card>

        {/* Billing & Subscription Section */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Billing & Subscription</h2>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Current Plan</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] capitalize">
                  {subscriptionInfo?.planType || user?.subscription_status || 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  (subscriptionInfo?.status === 'active' || user?.subscription_status === 'active')
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                }`}>
                  {subscriptionInfo?.status || user?.subscription_status || 'Inactive'}
                </span>
              </div>
              {subscriptionInfo && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Competitors</span>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {subscriptionInfo.currentCount} / {subscriptionInfo.competitorLimit === 0 ? '∞' : subscriptionInfo.competitorLimit}
                    </span>
                  </div>
                  {subscriptionInfo.currentPeriodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Renews On</span>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {format(new Date(subscriptionInfo.currentPeriodEnd), 'PP')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-[var(--border)]">
              {isSubscribed || user?.stripe_customer_id ? (
                <>
                  <Button variant="secondary" onClick={handleManageSubscription} className="w-full">
                    Manage Subscription
                  </Button>
                  {user?.stripe_subscription_id && (
                    <Button variant="danger" onClick={handleCancelSubscription} className="w-full">
                      Cancel Subscription
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Choose a plan to unlock full features
                  </p>
                  <Link href="/pricing">
                    <Button className="w-full">View Pricing Plans</Button>
                  </Link>
                </>
              )}
              {/* Always show manage subscription option if user exists */}
              {user && !isSubscribed && (
                <Button 
                  variant="ghost" 
                  onClick={handleManageSubscription} 
                  className="w-full text-sm"
                >
                  Open Billing Portal
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Email Preferences */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Email Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Summary Frequency</label>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Choose how often you want to receive competitor activity summaries via email
              </p>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                  <input
                    type="radio"
                    name="emailFrequency"
                    value="daily"
                    checked={emailFrequency === 'daily'}
                    onChange={(e) => setEmailFrequency(e.target.value as 'daily' | 'weekly' | 'off')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Daily</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Receive a summary every day with updates from the past 24 hours
                    </div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                  <input
                    type="radio"
                    name="emailFrequency"
                    value="weekly"
                    checked={emailFrequency === 'weekly'}
                    onChange={(e) => setEmailFrequency(e.target.value as 'daily' | 'weekly' | 'off')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Weekly</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Receive a summary once per week with updates from the past 7 days
                    </div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                  <input
                    type="radio"
                    name="emailFrequency"
                    value="off"
                    checked={emailFrequency === 'off'}
                    onChange={(e) => setEmailFrequency(e.target.value as 'daily' | 'weekly' | 'off')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">Off</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Don't send email summaries
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setSaving(true);
                  const {
                    data: { user: authUser },
                  } = await supabase.auth.getUser();

                  if (!authUser) {
                    alert('Please sign in');
                    return;
                  }

                  // Get profile ID first
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('auth_user_id', authUser.id)
                    .single();

                  if (!profile) {
                    throw new Error('Profile not found');
                  }

                  const { error } = await supabase
                    .from('profiles')
                    .update({
                      email_frequency: emailFrequency,
                      email_preferences_updated_at: new Date().toISOString(),
                    })
                    .eq('id', profile.id);

                  if (error) {
                    console.error('Supabase update error:', error);
                    throw new Error(error.message || 'Failed to update email preferences');
                  }

                  // Update local state
                  if (user) {
                    setUser({
                      ...user,
                      email_frequency: emailFrequency,
                      email_preferences_updated_at: new Date().toISOString(),
                    });
                  }

                  alert('Email preferences saved successfully!');
                } catch (error: any) {
                  console.error('Error saving email preferences:', error);
                  const errorMessage = 
                    error?.message || 
                    error?.error?.message || 
                    JSON.stringify(error) ||
                    'Failed to save email preferences. Make sure you have run the database migration.';
                  alert(errorMessage);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                return;
              }

              try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                window.location.href = '/';
              } catch (error) {
                console.error('Error deleting account:', error);
                alert('Failed to delete account');
              }
            }}
          >
            Delete Account
          </Button>
        </Card>
      </div>
    </div>
  );
}

