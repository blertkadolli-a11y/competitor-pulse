# 🚀 Pre-Launch Checklist

Complete these steps before launching your SpectraTrack app to production.

## ✅ Required Configuration

### 1. Environment Variables (`.env.local` or production env vars)

Create a `.env.local` file (for local) or set these in your hosting platform:

#### **Supabase (Required)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get:**
- Go to [Supabase Dashboard](https://app.supabase.com) > Your Project > Settings > API

#### **Stripe (Required for Payments)**
```bash
STRIPE_SECRET_KEY=sk_live_... (use sk_test_... for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (use pk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs - Create products in Stripe Dashboard first
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxx
```

**How to set up Stripe:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create 3 Products: Basic, Pro, Enterprise
3. Create monthly and annual prices for each
4. Copy Price IDs to environment variables
5. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`

#### **OpenAI (Required for AI Reports)**
```bash
OPENAI_API_KEY=sk-...
```

**Where to get:**
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)

#### **Email (Required for Email Reports)**
```bash
# Using Resend (recommended)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=SpectraTrack

# OR using SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_SECURE=true
```

**Resend setup:**
1. Sign up at [Resend](https://resend.com)
2. Verify your domain (or use test domain for testing)
3. Get API key from dashboard

#### **App Configuration**
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com (or http://localhost:3000 for dev)
CRON_SECRET=generate-random-secret-string-here
```

---

### 2. Database Setup (Supabase)

Run these SQL migrations in order in your Supabase SQL Editor:

1. **Base schema**: `supabase/schema.sql`
2. **Competitor tables**: `supabase/competitor_schema_clean.sql`
3. **Subscriptions**: `supabase/subscriptions_schema.sql`
4. **Reports**: `supabase/competitor_reports_schema.sql`
5. **Email preferences**: `supabase/email_preferences_schema.sql`
6. **Policies**: 
   - `supabase/snapshots_insert_policy.sql`
   - `supabase/alerts_insert_policy.sql`
   - `supabase/reports_policy_fix.sql`

**To run:**
1. Go to Supabase Dashboard > SQL Editor
2. Copy/paste each file's content
3. Click "Run"
4. Verify tables were created

---

### 3. Stripe Webhook Setup

**In Stripe Dashboard:**
1. Go to Developers > Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

### 4. Email Configuration

**Supabase Auth Email Settings:**
1. Go to Supabase Dashboard > Authentication > Settings
2. Configure email templates (optional)
3. Set "Site URL" to your production domain
4. Set "Redirect URLs" to allow your domain

**Resend Domain Verification:**
1. In Resend Dashboard, add your domain
2. Add DNS records (SPF, DKIM, DMARC)
3. Wait for verification
4. Use verified domain in `EMAIL_FROM`

---

### 5. Cron Jobs / Scheduled Tasks

Set up cron jobs to run these endpoints:

**Daily Scraping** (every 24 hours):
```bash
curl -X POST https://yourdomain.com/api/cron/scrape?secret=YOUR_CRON_SECRET
```

**Daily Email Summaries** (once per day):
```bash
curl -X POST https://yourdomain.com/api/cron/send-email-summaries?secret=YOUR_CRON_SECRET
```

**Options:**
- **Vercel Cron**: Add to `vercel.json`
- **GitHub Actions**: Set up scheduled workflow
- **External cron service**: Use cron-job.org or similar
- **Server cron**: If self-hosting, use system cron

**Example `vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/scrape",
    "schedule": "0 */24 * * *"
  }, {
    "path": "/api/cron/send-email-summaries",
    "schedule": "0 9 * * *"
  }]
}
```

---

### 6. Production Build Test

Test that the app builds correctly:

```bash
npm run build
npm start
```

Fix any build errors before deploying.

---

### 7. Security Checklist

- [ ] All environment variables set in production (never commit `.env.local`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` kept secret (server-side only)
- [ ] `STRIPE_SECRET_KEY` kept secret
- [ ] `CRON_SECRET` set and used to protect cron endpoints
- [ ] Supabase RLS policies enabled and tested
- [ ] Stripe webhook signature verification enabled
- [ ] HTTPS enabled in production
- [ ] CORS configured if needed

---

### 8. Domain & DNS

- [ ] Domain configured
- [ ] DNS records set up
- [ ] SSL certificate configured (automatic with Vercel/Netlify)
- [ ] Site URL updated in Supabase dashboard
- [ ] Redirect URLs configured in Supabase

---

### 9. Testing Checklist

Test these before launch:

- [ ] User signup works
- [ ] User login works
- [ ] Adding competitors works
- [ ] Competitor scanning works
- [ ] Stripe checkout works
- [ ] Subscription management works
- [ ] Webhook receives events
- [ ] AI report generation works
- [ ] Email sending works
- [ ] Email preferences save correctly
- [ ] Dashboard loads correctly
- [ ] All pages are accessible

---

### 10. Performance Optimization

- [ ] Run `npm run build` to check bundle size
- [ ] Enable Next.js Image Optimization
- [ ] Set up CDN if needed
- [ ] Configure caching headers
- [ ] Test page load speeds

---

### 11. Monitoring & Analytics

Recommended tools:
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Set up analytics (Vercel Analytics, Google Analytics)
- [ ] Monitor Stripe dashboard for failed payments
- [ ] Monitor Supabase dashboard for errors
- [ ] Set up uptime monitoring

---

### 12. Legal & Compliance

- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] Cookie consent (if needed)
- [ ] GDPR compliance (if targeting EU users)
- [ ] Payment terms clearly stated

---

## 🚀 Deployment Platforms

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Netlify
1. Push code to GitHub
2. Import project in Netlify
3. Add environment variables
4. Configure build: `npm run build` and publish directory: `.next`

### Self-Hosting
1. Build: `npm run build`
2. Start: `npm start`
3. Set up reverse proxy (nginx)
4. Configure SSL
5. Set up process manager (PM2)

---

## 📝 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with all variables above

# 3. Run database migrations in Supabase

# 4. Test build
npm run build

# 5. Test production build
npm start

# 6. Deploy to your platform
```

---

## ❗ Common Issues

1. **"Invalid Supabase URL"** → Check `NEXT_PUBLIC_SUPABASE_URL` is correct
2. **"Stripe not configured"** → Verify all Stripe env vars are set
3. **Webhooks not working** → Check webhook URL and secret
4. **Emails not sending** → Verify Resend API key or SMTP settings
5. **Build fails** → Check for TypeScript errors: `npm run build`

---

## 🎉 You're Ready!

Once all items above are complete, your app is ready for launch!

