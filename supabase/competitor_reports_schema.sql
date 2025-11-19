-- Competitor Reports table for AI-generated reports
create table if not exists public.competitor_reports (
  id uuid default uuid_generate_v4() primary key,
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.competitor_reports enable row level security;

-- RLS Policies
create policy "Users can view reports for own competitors"
  on public.competitor_reports for select
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = competitor_reports.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can insert reports for own competitors"
  on public.competitor_reports for insert
  with check (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = competitor_reports.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

create policy "Users can delete reports for own competitors"
  on public.competitor_reports for delete
  using (
    exists (
      select 1 from public.competitors
      join public.profiles on profiles.id = competitors.user_id
      where competitors.id = competitor_reports.competitor_id
      and profiles.auth_user_id = auth.uid()
    )
  );

-- Indexes for performance
create index if not exists competitor_reports_competitor_id_idx on public.competitor_reports(competitor_id);
create index if not exists competitor_reports_created_at_idx on public.competitor_reports(created_at desc);

