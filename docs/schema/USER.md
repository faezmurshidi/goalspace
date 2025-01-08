# User Schema Documentation

## Overview
This document outlines the database schema for user management in GoalSpace. The schema is designed to handle user authentication, subscription management, settings, and usage tracking.

## Tables

### 1. Users (`users`)
Primary table for storing user information and subscription status.

```sql
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
)
```

#### Fields Description
- `id`: UUID linked to Supabase auth
- `email`: User's email address (unique)
- `full_name`: User's full name
- `avatar_url`: URL to user's profile picture
- `subscription_tier`: Current subscription level (free/lite/pro)
- `subscription_status`: Current subscription status
- `api_calls_count`: Number of API calls made
- `mentor_interactions_count`: Number of interactions with mentor
- `faez_interactions_count`: Number of interactions with Faez

### 2. User Settings (`user_settings`)
Stores user preferences and settings.

```sql
create table user_settings (
  user_id uuid references users(id) primary key,
  theme text default 'light' check (theme in ('light', 'dark', 'system')),
  email_notifications boolean default true,
  mentor_style text default 'default' check (mentor_style in ('default', 'socratic', 'expert')),
  faez_style text default 'default' check (faez_style in ('default', 'precise', 'perplexity')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
)
```

#### Fields Description
- `user_id`: Reference to users table
- `theme`: UI theme preference
- `email_notifications`: Email notification settings
- `mentor_style`: Preferred mentor interaction style
- `faez_style`: Preferred Faez interaction style

### 3. User API Usage (`user_api_usage`)
Tracks API usage and performance metrics.

```sql
create table user_api_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  endpoint text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  response_time integer,
  status text,
  error text
)
```

#### Fields Description
- `endpoint`: API endpoint called
- `response_time`: Response time in milliseconds
- `status`: Response status
- `error`: Error message if any

### 4. User Subscription History (`user_subscription_history`)
Tracks changes in user subscriptions.

```sql
create table user_subscription_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  previous_tier text not null check (previous_tier in ('free', 'lite', 'pro')),
  new_tier text not null check (new_tier in ('free', 'lite', 'pro')),
  changed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reason text
)
```

## Security Policies

### Row Level Security (RLS)
```sql
-- Users table
create policy "Users can read own data"
  on users for select using (auth.uid() = id);

create policy "Users can update own data"
  on users for update
  using (auth.uid() = id)
  with check (auth.uid() = id and subscription_tier = old.subscription_tier);

-- User settings table
create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);
```

## Functions and Triggers

### Update Timestamps
```sql
-- Update updated_at column
create function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();

create trigger update_user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_updated_at_column();
```

### Automatic User Settings Creation
```sql
create function create_user_settings()
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
```

## Indexes
```sql
create index users_email_idx on users(email);
create index user_api_usage_user_id_timestamp_idx on user_api_usage(user_id, timestamp);
create index user_subscription_history_user_id_changed_at_idx 
  on user_subscription_history(user_id, changed_at);
```

## Usage Limits by Subscription Tier

### Free Tier
- API Requests: 50/hour
- Mentor Interactions: 20/day
- Faez Interactions: 10/day

### Lite Tier
- API Requests: 500/hour
- Mentor Interactions: 100/day
- Faez Interactions: 50/day

### Pro Tier
- API Requests: 2000/hour
- Mentor Interactions: Unlimited
- Faez Interactions: Unlimited 