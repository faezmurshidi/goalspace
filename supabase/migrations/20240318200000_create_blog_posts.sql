-- Migration: Create blog posts table and related security policies
--
-- Description: Creates a blog_posts table with RLS policies for public reading and authenticated user management
-- Affected tables: blog_posts
-- Author: AI Assistant
-- Date: 2024-03-20

-- Create blog_posts table with necessary columns and constraints
create table if not exists public.blog_posts (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    content text not null,
    author_name text not null,
    category text,
    tags text[] default array[]::text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add descriptive comment to the table
comment on table public.blog_posts is 'Blog posts table for storing articles and content.';

-- Enable Row Level Security (RLS)
alter table public.blog_posts enable row level security;

-- Create updated_at trigger function
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
    before update on public.blog_posts
    for each row
    execute function public.handle_updated_at();

-- RLS Policies
-- Note: Separate policies for anon and authenticated users as per best practices

-- Allow anonymous users to read blog posts
create policy "Blog posts are viewable by anonymous users."
    on public.blog_posts
    for select
    to anon
    using (true);

-- Allow authenticated users to read blog posts
create policy "Blog posts are viewable by authenticated users."
    on public.blog_posts
    for select
    to authenticated
    using (true);

-- Allow authenticated users to create blog posts
create policy "Authenticated users can create blog posts."
    on public.blog_posts
    for insert
    to authenticated
    with check (true);

-- Allow authors to update their own blog posts
-- Uses raw_user_meta_data->>'full_name' from auth.users for author verification
create policy "Users can update their own blog posts."
    on public.blog_posts
    for update
    to authenticated
    using (auth.uid() in (
        select id 
        from auth.users 
        where (raw_user_meta_data->>'full_name')::text = blog_posts.author_name
    ))
    with check (auth.uid() in (
        select id 
        from auth.users 
        where (raw_user_meta_data->>'full_name')::text = blog_posts.author_name
    ));

-- Allow authors to delete their own blog posts
create policy "Users can delete their own blog posts."
    on public.blog_posts
    for delete
    to authenticated
    using (auth.uid() in (
        select id 
        from auth.users 
        where (raw_user_meta_data->>'full_name')::text = blog_posts.author_name
    ));

-- Create indexes for better query performance
create index if not exists blog_posts_author_name_idx on public.blog_posts (author_name);
create index if not exists blog_posts_category_idx on public.blog_posts (category);
create index if not exists blog_posts_created_at_idx on public.blog_posts (created_at); 