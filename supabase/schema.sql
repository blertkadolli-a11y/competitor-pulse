-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
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

-- Competitors table
create table public.competitors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  website text not null,
  twitter_url text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Snapshots table
create table public.snapshots (
  id uuid default uuid_generate_v4() primary key,
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  html_content text,
  text_content text,
  price_info text,
  features jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Changes table
create table public.changes (
  id uuid default uuid_generate_v4() primary key,
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  snapshot_id uuid references public.snapshots(id) on delete cascade not null,
  previous_snapshot_id uuid references public.snapshots(id) on delete set null,
  change_type text not null check (change_type in ('text', 'pricing', 'feature', 'new_section', 'removed_section')),
  description text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Alerts table
create table public.alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  change_id uuid references public.changes(id) on delete cascade not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_type text not null check (report_type in ('daily', 'weekly')),
  content text not null,
  date_range_start timestamp with time zone not null,
  date_range_end timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Summaries table
create table public.ai_summaries (
  id uuid default uuid_generate_v4() primary key,
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  summary_text text not null,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) Policies
alter table public.profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.snapshots enable row level security;
alter table public.changes enable row level security;
alter table public.alerts enable row level security;
alter table public.reports enable row level security;
alter table public.ai_summaries enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = auth_user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = auth_user_id);

-- Competitors policies
create policy "Users can view own competitors"
  on public.competitors for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = competitors.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can insert own competitors"
  on public.competitors for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = competitors.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can update own competitors"
  on public.competitors for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = competitors.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can delete own competitors"
  on public.competitors for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = competitors.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Snapshots policies
create policy "Users can view snapshots for own competitors"
  on public.snapshots for select
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = snapshots.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can insert snapshots for own competitors"
  on public.snapshots for insert
  with check (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = snapshots.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Changes policies
create policy "Users can view changes for own competitors"
  on public.changes for select
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = changes.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Alerts policies (using competitor_id structure)
create policy "Users can view own alerts"
  on public.alerts for select
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = alerts.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can insert alerts for own competitors"
  on public.alerts for insert
  with check (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = alerts.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can update own alerts"
  on public.alerts for update
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = alerts.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Reports policies
create policy "Users can view own reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = reports.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can insert own reports"
  on public.reports for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = reports.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- AI Summaries policies
create policy "Users can view AI summaries for own competitors"
  on public.ai_summaries for select
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = ai_summaries.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Indexes for performance
create index profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index competitors_user_id_idx on public.competitors(user_id);
create index snapshots_competitor_id_idx on public.snapshots(competitor_id);
create index snapshots_created_at_idx on public.snapshots(created_at desc);
create index changes_competitor_id_idx on public.changes(competitor_id);
create index changes_created_at_idx on public.changes(created_at desc);
create index alerts_user_id_idx on public.alerts(user_id);
create index alerts_read_idx on public.alerts(read);
create index reports_user_id_idx on public.reports(user_id);

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
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at_competitors
  before update on public.competitors
  for each row execute procedure public.handle_updated_at();

