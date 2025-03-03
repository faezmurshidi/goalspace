-- Migration: Create spaces table
--
-- Description: Creates the spaces table which is a prerequisite for other tables
-- Affected tables: spaces
-- Author: AI Assistant
-- Date: 2024-03-20

-- Create spaces table with necessary columns and constraints
create table if not exists public.spaces (
    id uuid default gen_random_uuid() primary key,
    goal_id uuid,
    user_id uuid not null,
    title text not null,
    description text,
    category text,
    progress integer default 0,
    objectives jsonb default '{}'::jsonb,
    prerequisites jsonb default '{}'::jsonb,
    mentor jsonb default '{}'::jsonb,
    space_color jsonb default '{}'::jsonb,
    order_index integer default 0,
    mentor_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint fk_goal
        foreign key (goal_id)
        references public.goals(id)
        on delete set null
);

-- Add descriptive comment to the table
comment on table public.spaces is 'Spaces table for organizing content and goals.';

-- Enable Row Level Security (RLS)
alter table public.spaces enable row level security;

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
    before update on public.spaces
    for each row
    execute function public.handle_updated_at();

-- RLS Policies
-- Note: Separate policies for anon and authenticated users as per best practices

-- Allow authenticated users to read their own spaces
create policy "Users can view their own spaces."
    on public.spaces
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Allow authenticated users to create spaces
create policy "Users can create spaces."
    on public.spaces
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Allow users to update their own spaces
create policy "Users can update their own spaces."
    on public.spaces
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Allow users to delete their own spaces
create policy "Users can delete their own spaces."
    on public.spaces
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists spaces_user_id_idx on public.spaces (user_id);
create index if not exists spaces_goal_id_idx on public.spaces (goal_id);
create index if not exists spaces_created_at_idx on public.spaces (created_at); 