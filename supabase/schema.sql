-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
create table users (
  id uuid references auth.users primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'lite', 'pro')),
  subscription_status text default 'active' check (subscription_status in ('active', 'past_due', 'canceled')),
  subscription_period_end timestamp with time zone,
  api_calls_count integer default 0,
  mentor_interactions_count integer default 0,
  faez_interactions_count integer default 0
);

-- 2. User Settings Table
create table user_settings (
  user_id uuid references users(id) primary key,
  theme text default 'light' check (theme in ('light', 'dark', 'system')),
  email_notifications boolean default true,
  mentor_style text default 'default' check (mentor_style in ('default', 'socratic', 'expert')),
  faez_style text default 'default' check (faez_style in ('default', 'precise', 'perplexity')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User API Usage Table
create table user_api_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  endpoint text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  response_time integer,
  status text,
  error text
);

-- 4. User Subscription History Table
create table user_subscription_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  previous_tier text not null check (previous_tier in ('free', 'lite', 'pro')),
  new_tier text not null check (new_tier in ('free', 'lite', 'pro')),
  changed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reason text
);

-- 5. Goals Table
create table goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  title text not null,
  description text,
  category text not null check (category in ('learning', 'project', 'personal', 'professional')),
  status text default 'active' check (status in ('active', 'completed', 'archived', 'on_hold')),
  progress numeric(5,2) default 0 check (progress >= 0 and progress <= 100),
  start_date timestamp with time zone default timezone('utc'::text, now()),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_featured boolean default false,
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  analysis_data jsonb
);

-- 6. Spaces Table
create table spaces (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references goals(id) not null,
  user_id uuid references users(id) not null,
  title text not null,
  description text,
  category text not null check (category in ('learning', 'goal')),
  objectives text[] not null default '{}',
  prerequisites text[] default '{}',
  mentor jsonb not null,
  progress numeric(5,2) default 0 check (progress >= 0 and progress <= 100),
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  time_estimate interval,
  space_color jsonb,
  content text,
  methodology text,
  is_collapsed boolean default false
);

-- 7. Documents Table
create table documents (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references spaces(id) not null,
  user_id uuid references users(id) not null,
  title text not null,
  content text not null,
  type text not null check (type in ('tutorial', 'guide', 'reference', 'exercise')),
  tags text[] default '{}',
  is_generated boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb
);

-- 8. Tasks Table
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references spaces(id) not null,
  user_id uuid references users(id) not null,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  order_index integer not null default 0,
  dependencies uuid[] default '{}'
);

-- 9. Chat Messages Table
create table chat_messages (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references spaces(id) not null,
  user_id uuid references users(id) not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_faez boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb
);

-- Functions and Triggers

-- Update Timestamps Function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create Triggers for Updated At
create trigger update_users_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();

create trigger update_user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_updated_at_column();

create trigger update_goals_updated_at
  before update on goals
  for each row
  execute function update_updated_at_column();

create trigger update_spaces_updated_at
  before update on spaces
  for each row
  execute function update_updated_at_column();

create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();

create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at_column();

-- Progress Update Functions
create or replace function update_goal_progress()
returns trigger as $$
begin
  update goals
  set progress = (
    select avg(progress)
    from spaces
    where goal_id = new.goal_id
  )
  where id = new.goal_id;
  return new;
end;
$$ language plpgsql;

create trigger update_goal_progress_on_space_update
  after update of progress on spaces
  for each row
  execute function update_goal_progress();

create or replace function update_space_progress()
returns trigger as $$
begin
  update spaces
  set progress = (
    select count(*) * 100.0 / nullif(count(*), 0)
    from tasks
    where space_id = new.space_id
    and status = 'completed'
  )
  where id = new.space_id;
  return new;
end;
$$ language plpgsql;

create trigger update_space_progress_on_task_update
  after update of status on tasks
  for each row
  execute function update_space_progress();

-- Automatic User Settings Creation
create or replace function create_user_settings()
returns trigger as $$
begin
  insert into user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger on_user_created
  after insert on users
  for each row
  execute function create_user_settings();

-- Row Level Security Policies

-- Users
alter table users enable row level security;
create policy "Users can read own data"
  on users for select using (auth.uid() = id);
create policy "Users can update own data"
  on users for update
  using (auth.uid() = id)
  with check (auth.uid() = id and subscription_tier = old.subscription_tier);

-- User Settings
alter table user_settings enable row level security;
create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = user_id);
create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);

-- Goals
alter table goals enable row level security;
create policy "Users can read own goals"
  on goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on goals for update using (auth.uid() = user_id);

-- Spaces
alter table spaces enable row level security;
create policy "Users can read own spaces"
  on spaces for select using (auth.uid() = user_id);
create policy "Users can insert own spaces"
  on spaces for insert with check (auth.uid() = user_id);
create policy "Users can update own spaces"
  on spaces for update using (auth.uid() = user_id);

-- Documents
alter table documents enable row level security;
create policy "Users can read own documents"
  on documents for select using (auth.uid() = user_id);
create policy "Users can insert own documents"
  on documents for insert with check (auth.uid() = user_id);

-- Tasks
alter table tasks enable row level security;
create policy "Users can read own tasks"
  on tasks for select using (auth.uid() = user_id);
create policy "Users can manage own tasks"
  on tasks for all using (auth.uid() = user_id);

-- Chat Messages
alter table chat_messages enable row level security;
create policy "Users can read own messages"
  on chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages"
  on chat_messages for insert with check (auth.uid() = user_id);

-- Indexes
create index goals_user_id_idx on goals(user_id);
create index goals_status_idx on goals(status);
create index goals_category_idx on goals(category);

create index spaces_goal_id_idx on spaces(goal_id);
create index spaces_user_id_idx on spaces(user_id);
create index spaces_status_idx on spaces(status);

create index documents_space_id_idx on documents(space_id);
create index documents_type_idx on documents(type);
create index documents_tags_idx on documents using gin(tags);

create index tasks_space_id_idx on tasks(space_id);
create index tasks_status_idx on tasks(status);
create index tasks_order_idx on tasks(space_id, order_index);

create index user_api_usage_user_id_timestamp_idx on user_api_usage(user_id, timestamp);
create index user_subscription_history_user_id_changed_at_idx 
  on user_subscription_history(user_id, changed_at); 