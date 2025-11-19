# Stripe Subscription Integration - Implementation Summary

## Overview
Full Stripe subscription integration with 3 plans (Basic, Pro, Enterprise) and competitor limits enforcement.

## Database Schema

### Subscriptions Table (`supabase/subscriptions_schema.sql`)
```sql
create table public.subscriptions (
  id uuid primary key,
  user_id uuid references profiles(id),
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan_type text check (plan_type in ('basic', 'pro', 'enterprise')),
  status text check (status in ('active', 'canceled', 'past_due', 'trialing', ...)),
  current_period_start timestamp,
  current_period_end timestamp,
  cancel_at_period_end boolean,
  canceled_at timestamp,
  created_at timestamp,
  updated_at timestamp
);
```

**RLS Policies:**
- Users can view own subscriptions
- Users can update own subscriptions

## Plan Definitions (`lib/subscriptions/plans.ts`)

### Plans:
- **Basic**: $29/month ($24 annual) - 10 competitors
- **Pro**: $99/month ($79 annual) - 30 competitors  
- **Enterprise**: $299/month ($249 annual) - 100 competitors

### Key Functions:
- `getPlan(planType)` - Get plan details
- `getCompetitorLimit(planType)` - Get limit for plan
- `canAddCompetitor(currentCount, planType)` - Check if can add more

## Subscription Check Utility (`lib/subscriptions/check.ts`)

### Functions:
- `getSubscriptionInfo()` - Get current user's subscription info
- `canAddCompetitor()` - Check if user can add a competitor

### Returns:
```typescript
{
  planType: 'basic' | 'pro' | 'enterprise' | 'free',
  status: string,
  competitorLimit: number,
  currentCount: number,
  canAddMore: boolean,
  currentPeriodEnd?: string
}
```

## API Routes

### 1. Checkout (`app/api/stripe/create-checkout/route.ts`)
- Creates Stripe checkout session
- Accepts `priceId` and `planId`
- Stores plan_id in metadata

### 2. Webhook (`app/api/stripe/webhook/route.ts`)
Handles Stripe events:
- `checkout.session.completed` - Creates subscription record
- `customer.subscription.updated` - Updates subscription record
- `customer.subscription.deleted` - Marks subscription as canceled

### 3. Check Limit (`app/api/subscriptions/check-limit/route.ts`)
- Server-side API to check subscription limits
- Returns plan info and competitor count

## UI Components

### 1. Pricing Page (`app/pricing/page.tsx`)
- Shows 3 plans with competitor limits
- "Get Started" buttons trigger checkout
- Handles logged-in and logged-out users
- Monthly/annual toggle

### 2. Add Competitor Page (`app/dashboard/competitors/new/page.tsx`)
**Enforcement:**
- Checks subscription limit on page load
- Shows warning banner if limit reached
- Disables form if limit exceeded
- Re-checks limit before submission

**Warning Banner:**
```tsx
{subscriptionCheck && !subscriptionCheck.allowed && (
  <div className="warning-banner">
    <h3>Plan Limit Reached</h3>
    <p>{subscriptionCheck.reason}</p>
    <Link href="/pricing">
      <Button>Upgrade Plan</Button>
    </Link>
  </div>
)}
```

### 3. Settings Page (`app/dashboard/settings/page.tsx`)
**Billing Section Shows:**
- Current plan (Basic/Pro/Enterprise)
- Subscription status
- Competitor count (current / limit)
- Renewal date
- Manage Subscription button (Stripe portal)
- Cancel Subscription button

## Server-Side Enforcement

### In `createCompetitor()` (`lib/supabase/competitors.ts`)
```typescript
// Check subscription limit before creating
const { count: currentCount } = await supabase
  .from('competitors')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', profileId);

const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_type')
  .eq('user_id', profileId)
  .eq('status', 'active')
  .single();

const limit = limits[subscription?.plan_type || 'free'] || 0;

if ((currentCount || 0) >= limit) {
  throw new Error(`Plan limit reached: ${limit} competitors`);
}
```

## Environment Variables Required

Add to `.env.local`:
```bash
# Stripe Price IDs (create these in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
```

## Setup Steps

1. **Run Database Schema:**
   ```sql
   -- Run supabase/subscriptions_schema.sql in Supabase SQL Editor
   ```

2. **Create Stripe Products & Prices:**
   - Go to Stripe Dashboard > Products
   - Create 3 products: Basic, Pro, Enterprise
   - Create monthly and annual prices for each
   - Copy Price IDs to `.env.local`

3. **Set Up Webhook:**
   - Stripe Dashboard > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`

4. **Test Flow:**
   - Visit `/pricing`
   - Click "Get Started" on a plan
   - Complete Stripe checkout (use test card: 4242 4242 4242 4242)
   - Verify subscription created in Supabase
   - Try adding competitors up to limit
   - Verify limit enforcement works

## How Limit Enforcement Works

1. **Client-Side Check:**
   - `canAddCompetitor()` checks subscription and count
   - Shows warning banner if limit reached
   - Disables form submission

2. **Server-Side Check:**
   - `createCompetitor()` validates limit before insert
   - Throws error if limit exceeded
   - Prevents bypassing client-side checks

3. **Database Level:**
   - RLS policies ensure users can only see their own data
   - Subscription status checked from `subscriptions` table

## Key Files Created/Modified

**New Files:**
- `supabase/subscriptions_schema.sql` - Database schema
- `lib/subscriptions/plans.ts` - Plan definitions
- `lib/subscriptions/check.ts` - Subscription checking utilities
- `app/api/subscriptions/check-limit/route.ts` - Limit check API

**Modified Files:**
- `app/pricing/page.tsx` - Updated with 3 plans and checkout
- `app/api/stripe/create-checkout/route.ts` - Added plan_id metadata
- `app/api/stripe/webhook/route.ts` - Syncs to subscriptions table
- `app/dashboard/competitors/new/page.tsx` - Added limit checks
- `app/dashboard/settings/page.tsx` - Added billing section
- `lib/supabase/competitors.ts` - Added server-side limit enforcement

