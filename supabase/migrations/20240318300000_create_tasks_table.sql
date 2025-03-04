-- Migration: Create tasks table
--
-- Description: Creates the tasks table for tracking tasks within spaces
-- Affected tables: tasks
-- Author: AI Assistant
-- Date: 2024-03-20

-- Create tasks table with necessary columns and constraints
create table if not exists public.tasks (
    id uuid default gen_random_uuid() primary key,
    space_id uuid references public.spaces(id) on delete cascade not null,
    title text not null,
    description text,
    status text default 'pending',
    due_date timestamp with time zone,
    priority text default 'medium',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add descriptive comment to the table
comment on table public.tasks is 'Tasks table for tracking tasks within spaces.';

-- Enable Row Level Security (RLS)
alter table public.tasks enable row level security;

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
    before update on public.tasks
    for each row
    execute function public.handle_updated_at();

-- Create indexes for better query performance
create index if not exists tasks_space_id_idx on public.tasks (space_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_created_at_idx on public.tasks (created_at); 