-- Subscriptions table for Stripe subscription management
-- This table stores detailed subscription information linked to profiles

create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  plan_type text not null check (plan_type in ('basic', 'pro', 'enterprise')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false not null,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_stripe_subscription_id_idx on public.subscriptions(stripe_subscription_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

-- Row Level Security
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = subscriptions.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can update own subscriptions"
  on public.subscriptions for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = subscriptions.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
create or replace function public.handle_subscription_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger set_updated_at_subscriptions
  before update on public.subscriptions
  for each row execute procedure public.handle_subscription_updated_at();

