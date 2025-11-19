-- Add INSERT policy for reports table
-- This allows users to create their own reports

create policy "Users can insert own reports"
  on public.reports for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = reports.user_id
      and profiles.auth_user_id = auth.uid()
    )
  );

