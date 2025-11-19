# Vercel Deployment Setup Guide

## Quick Fix for "Failed to fetch" Error

The "Failed to fetch" error on signup/login pages means your **Supabase environment variables are missing in Vercel**.

## Step-by-Step Fix

### 1. Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Sign in to your account
3. Select your **CompetitorPulse** project

### 2. Add Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add the following **REQUIRED** variables:

#### Required Variables (Minimum for Signup/Login to Work):

```
NEXT_PUBLIC_SUPABASE_URL
```
- **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- **Get it from**: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API → Project URL

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
- **Value**: Your Supabase anon/public key (starts with `eyJhbGci...`)
- **Get it from**: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API → Project API keys → `anon` `public`

```
SUPABASE_SERVICE_ROLE_KEY
```
- **Value**: Your Supabase service role key (starts with `eyJhbGci...`)
- **Get it from**: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API → Project API keys → `service_role` `secret`
- ⚠️ **Keep this secret!** Never expose it in client-side code.

### 3. Set Environment for Each Variable
For each variable, select:
- ✅ **Production**
- ✅ **Preview** (optional, for testing)
- ✅ **Development** (optional, for local testing)

### 4. Redeploy
After adding variables:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeploy

## Complete Environment Variables List

For full functionality, also add these (see `env.template` for details):

### Stripe (for payments):
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL`
- `NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL`
- `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL`

### OpenAI (for AI reports):
- `OPENAI_API_KEY`

### Email (for email reports):
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`

### App Configuration:
- `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g., `https://competitor-pulse.vercel.app`)
- `CRON_SECRET` (random secret string for protecting cron endpoints)

## Verify Setup

After adding variables and redeploying:

1. **Check the signup page** - The "Failed to fetch" error should be gone
2. **Try creating an account** - Should work now
3. **Check browser console** (F12) - Should see no Supabase connection errors

## Common Issues

### Still seeing "Failed to fetch"?
1. ✅ Verify variables are added in Vercel (Settings → Environment Variables)
2. ✅ Check variable names are **exact** (case-sensitive, no extra spaces)
3. ✅ Verify values are correct (copy from Supabase Dashboard)
4. ✅ Redeploy after adding variables
5. ✅ Clear browser cache and try again

### Variables not working?
- Make sure you selected **Production** environment when adding variables
- Check for typos in variable names
- Verify Supabase project is **active** (not paused)
- Check Supabase Dashboard → Settings → API to confirm keys are correct

## Need Help?

1. Check Vercel deployment logs: **Deployments** → Click deployment → **Logs**
2. Check browser console (F12) for detailed errors
3. Verify Supabase project is active and accessible

