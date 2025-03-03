-- Migration: Create goals table
--
-- Description: Creates the goals table which is a prerequisite for spaces table
-- Affected tables: goals
-- Author: AI Assistant
-- Date: 2024-03-20

-- Create goals table with necessary columns and constraints
create table if not exists public.goals (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null,
    title text not null,
    description text,
    category text,
    progress integer default 0,
    status text default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add descriptive comment to the table
comment on table public.goals is 'Goals table for tracking user objectives and progress.';

-- Enable Row Level Security (RLS)
alter table public.goals enable row level security;

-- Create updated_at trigger function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create trigger for automatically updating updated_at timestamp
create trigger handle_updated_at
    before update on public.goals
    for each row
    execute function public.handle_updated_at();

-- RLS Policies
-- Note: Separate policies for anon and authenticated users as per best practices

-- Allow authenticated users to read their own goals
create policy "Users can view their own goals."
    on public.goals
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Allow authenticated users to create goals
create policy "Users can create goals."
    on public.goals
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Allow users to update their own goals
create policy "Users can update their own goals."
    on public.goals
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Allow users to delete their own goals
create policy "Users can delete their own goals."
    on public.goals
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_created_at_idx on public.goals (created_at); 