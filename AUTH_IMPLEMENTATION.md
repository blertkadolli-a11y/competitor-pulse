# Authentication Implementation Summary

## Overview

This document describes the authentication setup using Supabase for SpectraTrack. The implementation includes email/password authentication, route protection, and a profiles table linked to Supabase auth users.

## 1. Supabase Schema

### Profiles Table

The `profiles` table stores user information and is linked to Supabase auth users via `auth_user_id`:

```sql
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  auth_user_id uuid references auth.users(id) on delete cascade unique not null,
  name text,
  email text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'trialing' check (subscription_status in ('active', 'canceled', 'past_due', 'trialing')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

**Key points:**
- `id`: Separate UUID primary key for the profile
- `auth_user_id`: References `auth.users(id)` - links to Supabase auth user
- `name`: User's display name (extracted from signup metadata)
- `email`: User's email (synced from auth.users)
- Other tables reference `profiles(id)`, not `auth_user_id` directly

### Profile Creation Trigger

A trigger automatically creates a profile when a new user signs up:

```sql
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Row Level Security (RLS) Policies

All RLS policies use `auth_user_id` to match against the authenticated user:

```sql
-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

-- Competitors policies (indirect check via profile)
create policy "Users can view own competitors"
  on public.competitors for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = competitors.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );
```

## 2. Authentication Pages

### Login Page (`app/login/page.tsx`)

- Email and password input fields
- Supabase `signInWithPassword()` for authentication
- Redirects to dashboard or `redirect` query param on success
- Error handling with user-friendly messages
- Tailwind CSS styling with Card and Input components

**Key features:**
- Email/password authentication
- "Remember me" checkbox (UI only, can be extended)
- Forgot password link
- Redirects authenticated users to dashboard

### Signup Page (`app/signup/page.tsx`)

- Full name, email, and password input fields
- Supabase `signUp()` with metadata for full_name
- Profile is automatically created via database trigger
- Redirects to dashboard on success
- Password validation (min 6 characters)

**Key features:**
- Creates auth user and profile automatically
- Password strength validation
- Error handling
- Redirects authenticated users to dashboard

## 3. Route Protection

### Middleware (`middleware.ts`)

The middleware protects all dashboard routes and redirects unauthenticated users:

```typescript
export async function middleware(req: NextRequest) {
  // ... Supabase client setup ...
  
  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}
```

**Protected routes:**
- All routes under `/dashboard/*` require authentication
- Unauthenticated users are redirected to `/login` with a `redirect` query param
- Authenticated users accessing `/login` or `/signup` are redirected to `/dashboard`

**Middleware configuration:**
```typescript
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
```

## 4. Client-Side Authentication

### Supabase Client (`lib/supabase/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Profile Helper (`lib/supabase/profile.ts`)

Helper functions to get the current user's profile:

```typescript
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  return profile;
}

export async function getCurrentUserProfileId() {
  const profile = await getCurrentUserProfile();
  return profile?.id || null;
}
```

## 5. Dashboard Pages Authentication Pattern

All dashboard pages follow this pattern:

1. Get authenticated user from Supabase auth
2. Fetch profile using `auth_user_id`
3. Use `profile.id` for all database queries (competitors, alerts, reports, etc.)

**Example from `app/dashboard/page.tsx`:**

```typescript
const fetchDashboardData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return;

  // Use profile.id for queries
  const { data: competitorsData } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', profile.id)  // Use profile.id, not user.id
    .order('created_at', { ascending: false });
};
```

## 6. API Routes Authentication

All API routes that require authentication follow this pattern:

```typescript
// Get authenticated user
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Get profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('auth_user_id', user.id)
  .single();

if (!profile) {
  return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
}

// Use profile.id for database operations
```

## 7. TypeScript Types

```typescript
export interface Profile {
  id: string;
  auth_user_id: string;
  email?: string;
  name?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing';
  created_at: string;
  updated_at: string;
}

// Alias for backwards compatibility
export interface User extends Profile {}
```

## Summary

✅ **Email + password signup/login** - Implemented in `/login` and `/signup` pages
✅ **Protected dashboard routes** - Middleware protects all `/dashboard/*` routes
✅ **Redirect logged-out users** - Redirects to `/login` with redirect param
✅ **Tailwind styled auth pages** - Clean, minimal design
✅ **Session handling** - Middleware checks sessions on every request
✅ **Profiles table** - Separate `id` and `auth_user_id` columns
✅ **Profile linked to auth user** - Foreign key relationship via `auth_user_id`
✅ **Automatic profile creation** - Database trigger creates profile on signup

All authentication is fully functional and integrated throughout the application.

