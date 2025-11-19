# Stripe Setup Guide

## Fixing "Invalid API Key" Error

If you're seeing "Invalid API Key provided" error, follow these steps:

### 1. Get Your Stripe API Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Copy your **Publishable key** (starts with `pk_test_`)

### 2. Add Keys to `.env.local`

Create or update `.env.local` in your project root:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Stripe Webhook Secret (get this after setting up webhook)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Price IDs (create products/prices in Stripe Dashboard first)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
```

### 3. Common Issues

**Issue: Key starts with wrong prefix**
- Secret keys must start with `sk_test_` (test) or `sk_live_` (live)
- Publishable keys must start with `pk_test_` (test) or `pk_live_` (live)

**Issue: Extra spaces or quotes**
- Don't add quotes around the key: `STRIPE_SECRET_KEY="sk_test_..."` ❌
- Don't add spaces: `STRIPE_SECRET_KEY= sk_test_...` ❌
- Correct format: `STRIPE_SECRET_KEY=sk_test_...` ✅

**Issue: Wrong Stripe account**
- Make sure you're using keys from the correct Stripe account
- Test keys and live keys are different

**Issue: Server not restarted**
- After adding/changing `.env.local`, you MUST restart your dev server
- Stop the server (Ctrl+C) and run `npm run dev` again

### 4. Verify Your Keys

1. Check `.env.local` exists in project root
2. Check keys don't have quotes or extra spaces
3. Check keys start with correct prefix
4. Restart dev server: `npm run dev`

### 5. Create Stripe Products & Prices

1. Go to: https://dashboard.stripe.com/products
2. Create 3 products:
   - **Basic** - $29/month
   - **Pro** - $99/month  
   - **Enterprise** - $299/month
3. For each product, create:
   - Monthly recurring price
   - Annual recurring price (optional)
4. Copy the Price IDs (start with `price_`)
5. Add them to `.env.local` as shown above

### 6. Set Up Webhook (Optional for now)

1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret (starts with `whsec_`)
5. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Testing

After setup:
1. Restart dev server
2. Go to `/pricing` page
3. Click "Get Started" on a plan
4. Should redirect to Stripe checkout

If you still get errors, check:
- Server console for detailed error messages
- Browser console for client-side errors
- `.env.local` file format is correct

