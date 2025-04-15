-- Create the patients table
create table public.patients (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  email text not null,
  telefone text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null
);

-- Enable Row Level Security (RLS)
alter table public.patients enable row level security;

-- Create policy to allow users to select their own patients
create policy "Users can view their own patients"
  on public.patients
  for select
  using (auth.uid() = user_id);

-- Create policy to allow users to insert their own patients
create policy "Users can insert their own patients"
  on public.patients
  for insert
  with check (auth.uid() = user_id);

-- Create policy to allow users to update their own patients
create policy "Users can update their own patients"
  on public.patients
  for update
  using (auth.uid() = user_id);

-- Create policy to allow users to delete their own patients
create policy "Users can delete their own patients"
  on public.patients
  for delete
  using (auth.uid() = user_id); 