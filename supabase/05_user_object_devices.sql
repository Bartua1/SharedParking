-- Create User Object Devices table (maps users and vehicles to unique phone Bluetooth LE identifiers)
create table public.user_object_devices (
  user_id uuid references public.profiles(id) on delete cascade not null,
  object_id uuid references public.objects(id) on delete cascade not null,
  ble_device_id text not null,
  paired_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, object_id)
);
