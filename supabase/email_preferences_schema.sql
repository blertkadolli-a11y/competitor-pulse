-- Add email preferences to profiles table
alter table public.profiles 
add column if not exists email_frequency text default 'weekly' check (email_frequency in ('daily', 'weekly', 'off'));

-- Add email preferences updated timestamp
alter table public.profiles
add column if not exists email_preferences_updated_at timestamp with time zone;

-- Create index for email frequency queries
create index if not exists profiles_email_frequency_idx on public.profiles(email_frequency) where email_frequency != 'off';

