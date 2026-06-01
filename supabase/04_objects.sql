-- Create Objects table (represents shared vehicles)
create table public.objects (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  name varchar(255) not null,
  icon varchar(50) default '🚗' not null,
  last_latitude numeric(10, 8),
  last_longitude numeric(11, 8),
  last_updated_at timestamp with time zone,
  last_updated_by uuid references public.profiles(id) on delete set null
);
