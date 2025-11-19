# Authentication Troubleshooting Guide

## Common Issues and Fixes

### 1. Cannot Login or Sign Up

**Issue**: Users cannot log in or sign up, getting errors or no response.

**Check the following:**

#### A. Environment Variables
Make sure your `.env.local` file exists and has the correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**To verify:**
1. Go to your Supabase project dashboard
2. Settings > API
3. Copy the Project URL and anon/public key

#### B. Supabase Email Confirmation Settings
By default, Supabase requires email confirmation. You have two options:

**Option 1: Disable Email Confirmation (for development)**
1. Go to Supabase Dashboard > Authentication > Settings
2. Under "Email Auth", disable "Confirm email"
3. Save changes

**Option 2: Keep Email Confirmation Enabled**
- Users will receive a confirmation email
- They must click the link to verify their account
- Then they can log in

#### C. Database Schema
Make sure you've run the SQL schema in Supabase:
1. Go to Supabase Dashboard > SQL Editor
2. Paste the contents of `supabase/schema.sql`
3. Run the SQL
4. Verify the `profiles` table exists

#### D. Row Level Security (RLS)
Check that RLS policies are correctly set:
1. Go to Supabase Dashboard > Authentication > Policies
2. Make sure policies exist for the `profiles` table
3. Policies should use `auth_user_id` to match authenticated users

### 2. Login Works but Session Doesn't Persist

**Issue**: User can log in but gets redirected back to login page.

**Fixes:**
- Clear browser cookies and try again
- Check that `NEXT_PUBLIC_SUPABASE_URL` is correctly set
- Verify middleware is correctly configured
- Check browser console for errors

### 3. Profile Not Created on Signup

**Issue**: User signs up but profile is not created in database.

**Check:**
1. Verify the trigger function exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. If missing, run this in Supabase SQL Editor:
   ```sql
   -- Function to create profile on user signup
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (auth_user_id, email, name)
     values (
       new.id,
       new.email,
       coalesce(new.raw_user_meta_data->>'full_name', '')
     );
     return new;
   end;
   $$ language plpgsql security definer;

   -- Trigger for new user creation
   drop trigger if exists on_auth_user_created on auth.users;
   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ```

### 4. "Unauthorized" or "Profile not found" Errors

**Issue**: Getting authorization errors when accessing dashboard.

**Check:**
1. Verify RLS policies are enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'profiles';
   ```

2. Check that policies use `auth_user_id`:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'profiles';
   ```

### 5. Browser Console Errors

**Common errors:**

- `Invalid API key`: Check your `.env.local` file
- `Failed to fetch`: Check Supabase URL is correct
- `Cookies not set`: Clear cookies and try again

### 6. Development Server Issues

**If the dev server won't start:**

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Start dev server
npm run dev
```

## Testing Authentication

### Manual Test Steps:

1. **Test Signup:**
   - Go to `/signup`
   - Enter email, password (min 6 chars), name
   - Click "Create account"
   - Check browser console for errors
   - Check Supabase Dashboard > Authentication > Users for new user

2. **Test Login:**
   - Go to `/login`
   - Enter credentials
   - Click "Sign in"
   - Should redirect to `/dashboard`
   - If not, check error message

3. **Test Profile Creation:**
   - After signup, go to Supabase Dashboard
   - Check `profiles` table for new entry
   - Verify `auth_user_id` matches user ID in `auth.users`

## Quick Fixes

### Reset Everything:
```bash
# 1. Clear Next.js cache
rm -rf .next

# 2. Clear browser cookies
# (Use browser developer tools)

# 3. Restart dev server
npm run dev

# 4. Try signup/login again
```

### Verify Supabase Setup:
```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## Still Having Issues?

1. Check browser console for specific error messages
2. Check Supabase Dashboard > Logs for server-side errors
3. Verify all environment variables are set correctly
4. Make sure Supabase project is active and not paused
5. Check that you're using the correct Supabase URL and keys

