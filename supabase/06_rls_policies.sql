-- 1. Enable Row Level Security (RLS) across all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.objects enable row level security;
alter table public.user_object_devices enable row level security;

-- 2. Helper Function to determine group membership
create or replace function public.is_group_member(group_id uuid, user_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.group_members
    where group_members.group_id = is_group_member.group_id
      and group_members.user_id = is_group_member.user_id
  );
end;
$$ language plpgsql;

-- 3. Profiles Policies
-- Allow anyone authenticated to select profiles (to display usernames & avatars of group members)
create policy "Allow authenticated users to view profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Allow users to update their own profile details
create policy "Allow users to update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Allow users to insert their own profile details
create policy "Allow users to insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 4. Groups Policies
-- Allow group members to view details of groups they belong to
create policy "Allow members to view group details" on public.groups
  for select using (
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

-- Allow any authenticated user to create a new group
create policy "Allow authenticated to insert groups" on public.groups
  for insert with check (auth.uid() = created_by);

-- 5. Group Members Policies
-- Allow members to see membership records of groups they are in
create policy "Allow members to view group memberships" on public.group_members
  for select using (
    public.is_group_member(group_id, auth.uid())
  );

-- Allow users to join groups
create policy "Allow users to insert membership" on public.group_members
  for insert with check (auth.uid() = user_id);

-- Allow users to leave groups
create policy "Allow users to delete membership" on public.group_members
  for delete using (auth.uid() = user_id);

-- 6. Objects Policies
-- Allow members to view vehicles in their groups
create policy "Allow group members to view vehicles" on public.objects
  for select using (
    public.is_group_member(group_id, auth.uid())
  );

-- Allow members to register vehicles in their groups
create policy "Allow group members to insert vehicles" on public.objects
  for insert with check (
    public.is_group_member(group_id, auth.uid())
  );

-- Allow members to update vehicle locations / details in their groups
create policy "Allow group members to update vehicles" on public.objects
  for update using (
    public.is_group_member(group_id, auth.uid())
  );

-- Allow members to delete vehicles from their groups
create policy "Allow group members to delete vehicles" on public.objects
  for delete using (
    public.is_group_member(group_id, auth.uid())
  );

-- 7. User Object Devices Policies
-- Allow users to view their own Bluetooth pairings
create policy "Allow users to view own device pairing" on public.user_object_devices
  for select using (auth.uid() = user_id);

-- Allow users to insert/create their own Bluetooth pairings
create policy "Allow users to create own device pairing" on public.user_object_devices
  for insert with check (
    auth.uid() = user_id and 
    exists (
      select 1 from public.objects
      where objects.id = object_id and 
            public.is_group_member(objects.group_id, auth.uid())
    )
  );

-- Allow users to update their own Bluetooth pairings
create policy "Allow users to update own device pairing" on public.user_object_devices
  for update using (auth.uid() = user_id);

-- Allow users to remove their own Bluetooth pairings
create policy "Allow users to delete own device pairing" on public.user_object_devices
  for delete using (auth.uid() = user_id);
