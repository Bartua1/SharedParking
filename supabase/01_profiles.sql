-- Create Profiles table linked to Supabase Auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username varchar(255) unique not null,
  avatar_url text,
  total_logins integer default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
