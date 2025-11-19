-- Add INSERT policy for alerts table
-- This allows users to create alerts for their own competitors

-- Note: The alerts table structure uses competitor_id, not user_id
-- So we need to check through competitors -> profiles -> auth_user_id

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

