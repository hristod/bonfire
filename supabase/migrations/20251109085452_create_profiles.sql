-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text unique not null,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies: Anyone can view profiles
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data->>'nickname');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
