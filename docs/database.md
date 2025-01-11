# Database Schema Documentation

## Overview

GoalSpace uses PostgreSQL via Supabase for data storage. This document outlines the database schema, relationships, and security policies.

## Tables

### Users
Core user information linked to Supabase Auth.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

#### Relationships
- One-to-one with `auth.users`
- One-to-one with `user_settings`
- One-to-many with `goals`
- One-to-many with `spaces`

#### RLS Policies
```sql
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### User Settings
User preferences and configuration.

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'dark' NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);
```

#### Relationships
- One-to-one with `users`

#### RLS Policies
```sql
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);
```

### Goals
User goals and their metadata.

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'learning' NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

#### Relationships
- Many-to-one with `users`
- One-to-many with `spaces`

#### RLS Policies
```sql
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);
```

### Spaces
Learning spaces associated with goals.

```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'learning' NOT NULL,
  objectives JSONB,
  prerequisites JSONB,
  mentor JSONB,
  progress INTEGER DEFAULT 0,
  space_color JSONB,
  mentor_type TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

#### Relationships
- Many-to-one with `users`
- Many-to-one with `goals`
- One-to-many with `tasks`

#### RLS Policies
```sql
CREATE POLICY "Users can view own spaces" ON spaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own spaces" ON spaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spaces" ON spaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spaces" ON spaces
  FOR DELETE USING (auth.uid() = user_id);
```

## Triggers

### Updated At Timestamp
Automatically updates the `updated_at` column when a record is modified.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
```

## Indexes

### Primary Keys
- All tables use UUID primary keys
- Generated using `uuid_generate_v4()`

### Foreign Keys
- `user_settings.user_id` → `users.id`
- `goals.user_id` → `users.id`
- `spaces.user_id` → `users.id`
- `spaces.goal_id` → `goals.id`

### Unique Constraints
- `users.email`
- `user_settings.user_id`

## Data Types

### JSONB Fields
Used for flexible schema fields:
- `spaces.objectives`
- `spaces.prerequisites`
- `spaces.mentor`
- `spaces.space_color`

### Timestamps
- All timestamps use `TIMESTAMP WITH TIME ZONE`
- Stored in UTC using `TIMEZONE('utc'::text, NOW())`

### Enums (via CHECK constraints)
- `goals.category`: 'learning', 'project', 'personal', 'professional'
- `goals.status`: 'active', 'completed', 'archived', 'on_hold'
- `spaces.category`: 'learning', 'goal'

## Migrations

All schema changes should be made through migrations:
1. Create a new migration file in `supabase/migrations/`
2. Test locally using Supabase CLI
3. Apply to production via Supabase dashboard

## Backup and Recovery

### Automated Backups
- Daily point-in-time recovery (PITR)
- 7-day retention period

### Manual Backups
```sql
pg_dump -U postgres -h localhost -p 54322 postgres > backup.sql
```
