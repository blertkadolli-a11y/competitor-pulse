# Setting Up Stripe Price IDs

## Quick Setup Guide

The "Price configuration error" occurs because Stripe Price IDs are not configured. Follow these steps:

### Step 1: Create Products in Stripe

1. Go to: https://dashboard.stripe.com/products
2. Make sure you're in **Test mode** (toggle in top right)
3. Click **"+ Add product"**

Create these 3 products:

#### Product 1: Basic Plan
- **Name**: Basic Plan
- **Description**: Track up to 10 competitors
- **Pricing**: 
  - **Monthly**: $29/month (recurring)
  - **Annual**: $24/month (recurring, billed annually)
- Click **"Save product"**

#### Product 2: Pro Plan
- **Name**: Pro Plan
- **Description**: Track up to 30 competitors
- **Pricing**:
  - **Monthly**: $99/month (recurring)
  - **Annual**: $79/month (recurring, billed annually)
- Click **"Save product"**

#### Product 3: Enterprise Plan
- **Name**: Enterprise Plan
- **Description**: Track up to 100 competitors
- **Pricing**:
  - **Monthly**: $299/month (recurring)
  - **Annual**: $249/month (recurring, billed annually)
- Click **"Save product"**

### Step 2: Copy Price IDs

For each product you created:

1. Click on the product name
2. You'll see the prices listed
3. Copy the **Price ID** for each price (starts with `price_`)
   - Example: `price_1ABC123def456GHI789`

You should have **6 Price IDs total**:
- Basic Monthly: `price_xxx`
- Basic Annual: `price_xxx`
- Pro Monthly: `price_xxx`
- Pro Annual: `price_xxx`
- Enterprise Monthly: `price_xxx`
- Enterprise Annual: `price_xxx`

### Step 3: Add to .env.local

Open `.env.local` and add these lines:

```bash
# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_YOUR_BASIC_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_YOUR_BASIC_ANNUAL_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_YOUR_PRO_ANNUAL_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL=price_YOUR_ENTERPRISE_ANNUAL_PRICE_ID
```

Replace `price_YOUR_...` with your actual Price IDs from Stripe.

### Step 4: Restart Dev Server

After updating `.env.local`:

1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`

### Step 5: Test

1. Go to `/pricing` page
2. Click "Get Started" on any plan
3. Should redirect to Stripe Checkout

## Troubleshooting

**Issue: Still getting "Price configuration error"**
- Make sure Price IDs start with `price_`
- Make sure there are no quotes around the values
- Make sure you restarted the dev server
- Check browser console for the exact missing variable name

**Issue: Can't find Price IDs in Stripe**
- Make sure you're in Test mode
- Click on the product, then click on the price
- The Price ID is shown at the top of the price details page

**Issue: Prices not showing correctly**
- Verify the Price IDs match the products you created
- Make sure monthly/annual prices are set up correctly in Stripe

## Example .env.local

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_1ABC123def456GHI789
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_1XYZ789abc123DEF456
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1PRO123monthly456
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_1PRO123annual456
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1ENT123monthly456
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL=price_1ENT123annual456
```

