# Email Summaries Setup Guide

## Overview

The email summary system sends automated competitor activity summaries to users based on their email frequency preferences (daily, weekly, or off).

## Setup Steps

### 1. Run Database Migration

Run the SQL migration to add email preferences to the profiles table:

```sql
-- File: supabase/email_preferences_schema.sql
-- Run this in Supabase SQL Editor
```

This adds:
- `email_frequency` column (daily/weekly/off, default: weekly)
- `email_preferences_updated_at` timestamp
- Index for efficient queries

### 2. Set Up Resend (Email Provider)

1. **Sign up for Resend:**
   - Go to: https://resend.com
   - Create an account (free tier available)

2. **Get API Key:**
   - Go to: https://resend.com/api-keys
   - Click "Create API Key"
   - Copy the API key (starts with `re_`)

3. **Add to `.env.local`:**
   ```bash
   # Email Configuration
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_YOUR_API_KEY_HERE
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=SpectraTrack
   ```

4. **Verify Domain (Optional but Recommended):**
   - Go to: https://resend.com/domains
   - Add your domain
   - Follow DNS verification steps
   - Update `EMAIL_FROM` to use your verified domain

### 3. Configure Cron Job

Set up a scheduled job to send email summaries:

#### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-email-summaries",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8 AM UTC.

#### Option B: External Cron Service

Use a service like:
- **Cron-job.org**: https://cron-job.org
- **EasyCron**: https://www.easycron.com
- **GitHub Actions**: Set up a scheduled workflow

Example cron schedule:
- Daily at 8 AM: `0 8 * * *`
- Weekly on Monday at 8 AM: `0 8 * * 1`

**Important:** Protect your endpoint with a secret:

```bash
# Add to .env.local
CRON_SECRET=your-random-secret-string-here
```

Then call: `GET /api/cron/send-email-summaries?secret=your-random-secret-string-here`

### 4. Test Email Summaries

#### Manual Test

1. Set your email frequency in Settings (Dashboard → Settings → Email Preferences)
2. Create some competitors and scan them
3. Generate some alerts and AI reports
4. Manually trigger the endpoint:

```bash
# Using curl
curl "http://localhost:3000/api/cron/send-email-summaries?secret=YOUR_SECRET"

# Or visit in browser (if CRON_SECRET is not set)
http://localhost:3000/api/cron/send-email-summaries
```

#### Test Individual User

You can also test sending to a specific user by calling the function directly:

```typescript
import { sendUserEmailSummary } from '@/lib/email-summaries';

// In an API route or server function
await sendUserEmailSummary('user-profile-id');
```

## Email Content

Each email includes:

1. **Summary Statistics:**
   - Number of competitors updated
   - Number of new alerts
   - Number of AI reports generated

2. **Recent Alerts:**
   - Top 5 unread alerts
   - Competitor name, alert type, and message

3. **AI Insights:**
   - Up to 3 recent AI-generated reports
   - Competitor name and report title

4. **Call-to-Action:**
   - Link to dashboard
   - Link to manage email preferences

## User Preferences

Users can set their email frequency in:
- **Dashboard → Settings → Email Preferences**

Options:
- **Daily**: Summary every day (past 24 hours)
- **Weekly**: Summary once per week (past 7 days) - sent on Monday
- **Off**: No email summaries

## Email Provider Abstraction

The system uses `lib/email.ts` which abstracts email sending. Currently supports:
- **Resend** (default)

To add another provider:
1. Add provider logic to `lib/email.ts`
2. Update `EMAIL_PROVIDER` env variable
3. Add provider-specific env variables

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key:**
   - Verify `RESEND_API_KEY` is set correctly
   - Check Resend dashboard for API usage/errors

2. **Check Email From Address:**
   - Must be verified domain (or use Resend's test domain)
   - Default: `onboarding@resend.dev` (for testing)

3. **Check User Preferences:**
   - User must have `email_frequency` set to 'daily' or 'weekly'
   - User must have an email address

4. **Check Cron Job:**
   - Verify cron is running
   - Check logs for errors
   - Test endpoint manually

### Database Errors

1. **Table Missing:**
   - Run `supabase/email_preferences_schema.sql` migration

2. **Column Missing:**
   - Verify `email_frequency` column exists
   - Check column type is `text` with check constraint

### Email Format Issues

- Emails use HTML templates
- Check browser email client compatibility
- Test with multiple email providers (Gmail, Outlook, etc.)

## Environment Variables Summary

```bash
# Required
RESEND_API_KEY=re_YOUR_API_KEY

# Optional
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=SpectraTrack
CRON_SECRET=your-secret-for-protecting-cron-endpoint
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Next Steps

1. ✅ Run database migration
2. ✅ Set up Resend account and API key
3. ✅ Add environment variables
4. ✅ Configure cron job
5. ✅ Test email sending
6. ✅ Monitor email delivery in Resend dashboard

## Support

- Resend Docs: https://resend.com/docs
- Resend Dashboard: https://resend.com/emails (view sent emails)
- Check server logs for detailed error messages

