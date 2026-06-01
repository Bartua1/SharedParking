-- Create Groups table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name varchar(255) not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
