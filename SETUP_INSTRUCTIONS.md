# Setup Instructions - Fix Login/Signup Issues

## 🔴 Main Issue Found

**The `.env.local` file is missing or not configured!** This is why login/signup isn't working.

## Quick Fix Steps

### 1. Create `.env.local` File

I've created a `.env.local` file for you. Now you need to fill in your Supabase credentials:

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project** (or create one if you haven't)
3. **Go to Settings > API**
4. **Copy the following values:**
   - **Project URL** → Paste into `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Paste into `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 2. Update `.env.local` File

Open `.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Set Up Supabase Database

Run the SQL schema in your Supabase project:

1. **Go to Supabase Dashboard > SQL Editor**
2. **Copy and paste the entire contents of `supabase/schema.sql`**
3. **Click "Run"** to execute the SQL
4. **Verify** that the `profiles` table was created

### 4. Configure Email Settings (Important!)

By default, Supabase requires email confirmation. For testing, you can disable it:

1. **Go to Supabase Dashboard > Authentication > Settings**
2. **Scroll to "Email Auth"**
3. **Toggle OFF "Confirm email"** (for development only)
4. **Save changes**

**OR** keep it enabled and users will need to confirm their email via a link before logging in.

### 5. Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Test Login/Signup

1. **Go to** http://localhost:3000/signup
2. **Create an account** with:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123456 (minimum 6 characters)
3. **Click "Create account"**
4. **You should be redirected to** `/dashboard`

## What I Fixed

✅ **Updated Supabase client** to use `createBrowserClient` from `@supabase/ssr` for proper cookie handling
✅ **Improved error handling** in login/signup pages
✅ **Added session validation** to ensure sessions are created
✅ **Handled email confirmation** flow better
✅ **Improved signout** functionality

## Still Having Issues?

Check `TROUBLESHOOTING.md` for detailed solutions to common problems.

### Common Checks:

1. ✅ `.env.local` file exists and has correct values
2. ✅ Supabase project is active (not paused)
3. ✅ Database schema has been run
4. ✅ Email confirmation is disabled OR user confirmed email
5. ✅ Development server restarted after adding `.env.local`
6. ✅ Browser console shows no errors

### Verify Environment Variables:

```bash
# Check if variables are set (should show your values, not "undefined")
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

If it shows `undefined`, make sure:
- The file is named exactly `.env.local` (with the dot)
- The file is in the project root (same directory as `package.json`)
- You've restarted the dev server after creating/updating the file

## Need Help?

1. Check browser console (F12) for errors
2. Check Supabase Dashboard > Logs for server errors
3. Verify all steps above are completed
4. See `TROUBLESHOOTING.md` for more detailed help

