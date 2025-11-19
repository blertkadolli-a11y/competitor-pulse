-- Competitor Tracking System Schema (CLEAN VERSION)
-- Run this SQL in your Supabase SQL Editor
-- This version handles migrations from existing schema gracefully

-- ==================== COMPETITORS TABLE ====================
-- Add social_links column to existing competitors table or create new table
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'competitors'
  ) then
    -- Add social_links column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'competitors' 
      and column_name = 'social_links'
    ) then
      alter table public.competitors add column social_links jsonb default '{}'::jsonb;
      
      -- Migrate existing social link columns to jsonb if they exist
      if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'competitors' 
        and column_name = 'twitter_url'
      ) then
        update public.competitors 
        set social_links = jsonb_build_object(
          'twitter', nullif(twitter_url, ''),
          'linkedin', nullif(linkedin_url, ''),
          'facebook', nullif(facebook_url, ''),
          'instagram', nullif(instagram_url, '')
        )
        where twitter_url is not null 
           or linkedin_url is not null 
           or facebook_url is not null 
           or instagram_url is not null;
      end if;
    end if;
  else
    -- Create new competitors table
    create table public.competitors (
      id uuid default uuid_generate_v4() primary key,
      user_id uuid references public.profiles(id) on delete cascade not null,
      name text not null,
      website text not null,
      social_links jsonb default '{}'::jsonb,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

-- ==================== SNAPSHOTS TABLE ====================
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'snapshots'
  ) then
    -- Add changes_summary column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'snapshots' 
      and column_name = 'changes_summary'
    ) then
      alter table public.snapshots add column changes_summary jsonb default '{}'::jsonb;
      
      -- Migrate existing data to changes_summary if possible (only if old columns exist)
      if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'snapshots' 
        and column_name in ('text_content', 'price_info', 'features')
      ) then
        update public.snapshots 
        set changes_summary = jsonb_build_object(
          'text_changes', case 
            when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'snapshots' and column_name = 'text_content')
              and text_content is not null 
            then to_jsonb(array[text_content]) 
            else '[]'::jsonb 
          end,
          'pricing_changes', case 
            when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'snapshots' and column_name = 'price_info')
              and price_info is not null 
            then jsonb_build_array(jsonb_build_object('description', price_info)) 
            else '[]'::jsonb 
          end,
          'feature_changes', case 
            when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'snapshots' and column_name = 'features')
              and features is not null 
              and jsonb_typeof(features) = 'array' 
              and jsonb_array_length(features) > 0 
            then features 
            else '[]'::jsonb 
          end
        )
        where changes_summary = '{}'::jsonb;
      end if;
    end if;
  else
    -- Create new snapshots table
    create table public.snapshots (
      id uuid default uuid_generate_v4() primary key,
      competitor_id uuid references public.competitors(id) on delete cascade not null,
      html_content text,
      changes_summary jsonb default '{}'::jsonb,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

-- ==================== ALERTS TABLE ====================
-- Migrate existing alerts table to new structure
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'alerts'
  ) then
    -- Add is_read column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'alerts' 
      and column_name = 'is_read'
    ) then
      alter table public.alerts add column is_read boolean default false;
      
      -- Copy data from 'read' to 'is_read' if 'read' column exists
      if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'alerts' 
        and column_name = 'read'
      ) then
        update public.alerts set is_read = "read";
      end if;
      
      alter table public.alerts alter column is_read set not null;
      alter table public.alerts alter column is_read set default false;
    end if;
    
    -- Add type column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'alerts' 
      and column_name = 'type'
    ) then
      alter table public.alerts add column type text default 'other';
      update public.alerts set type = 'other' where type is null;
      alter table public.alerts alter column type set not null;
      
      -- Drop constraint if exists to avoid conflicts
      alter table public.alerts drop constraint if exists alerts_type_check;
      alter table public.alerts add constraint alerts_type_check 
        check (type in ('pricing', 'content', 'feature', 'other'));
    end if;
    
    -- Add message column if it doesn't exist
    if not exists (
      select 1 from information_schema.columns 
      where table_schema = 'public' 
      and table_name = 'alerts' 
      and column_name = 'message'
    ) then
      alter table public.alerts add column message text;
      update public.alerts set message = 'Change detected' where message is null;
      alter table public.alerts alter column message set not null;
    end if;
  else
    -- Create new alerts table if it doesn't exist
    create table public.alerts (
      id uuid default uuid_generate_v4() primary key,
      competitor_id uuid references public.competitors(id) on delete cascade not null,
      type text not null check (type in ('pricing', 'content', 'feature', 'other')),
      message text not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      is_read boolean default false not null
    );
  end if;
end $$;

-- ==================== ROW LEVEL SECURITY ====================
alter table public.competitors enable row level security;
alter table public.snapshots enable row level security;
alter table public.alerts enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view own competitors" on public.competitors;
drop policy if exists "Users can insert own competitors" on public.competitors;
drop policy if exists "Users can update own competitors" on public.competitors;
drop policy if exists "Users can delete own competitors" on public.competitors;

drop policy if exists "Users can view snapshots for own competitors" on public.snapshots;
drop policy if exists "Users can insert snapshots for own competitors" on public.snapshots;

drop policy if exists "Users can view alerts for own competitors" on public.alerts;
drop policy if exists "Users can update own alerts" on public.alerts;
drop policy if exists "Users can insert alerts for own competitors" on public.alerts;

-- ==================== RLS POLICIES ====================

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

-- Alerts policies
create policy "Users can view alerts for own competitors"
  on public.alerts for select
  using (
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

-- ==================== INDEXES ====================
create index if not exists competitors_user_id_idx on public.competitors(user_id);
create index if not exists competitors_created_at_idx on public.competitors(created_at desc);
create index if not exists snapshots_competitor_id_idx on public.snapshots(competitor_id);
create index if not exists snapshots_created_at_idx on public.snapshots(created_at desc);
create index if not exists alerts_competitor_id_idx on public.alerts(competitor_id);
create index if not exists alerts_created_at_idx on public.alerts(created_at desc);

-- Create is_read index only if the column exists (after migration)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'alerts' 
    and column_name = 'is_read'
  ) then
    create index if not exists alerts_is_read_idx on public.alerts(is_read);
  end if;
end $$;

-- ==================== TRIGGERS ====================
-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at on competitors
drop trigger if exists set_updated_at_competitors on public.competitors;
create trigger set_updated_at_competitors
  before update on public.competitors
  for each row execute procedure public.handle_updated_at();

