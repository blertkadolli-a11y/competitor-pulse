-- Add INSERT policy for snapshots table
-- This allows users to create snapshots for their own competitors

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

