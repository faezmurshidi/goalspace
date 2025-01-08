# Goals and Spaces Schema Documentation

## Overview
This document outlines the database schema for goals, spaces, and related entities in GoalSpace. The schema is designed to handle goal tracking, learning spaces, knowledge management, and progress tracking.

## Tables

### 1. Goals (`goals`)
Primary table for storing user goals and their metadata.

```sql
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
  analysis_data jsonb -- Stores Faez's analysis and recommendations
)
```

#### Fields Description
- `user_id`: Reference to the user who owns the goal
- `title`: Goal title
- `description`: Detailed goal description
- `category`: Type of goal
- `status`: Current goal status
- `progress`: Overall progress percentage
- `analysis_data`: JSON data from Faez's goal analysis

### 2. Spaces (`spaces`)
Learning and project spaces associated with goals.

```sql
create table spaces (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references goals(id) not null,
  user_id uuid references users(id) not null,
  title text not null,
  description text,
  category text not null check (category in ('learning', 'goal')),
  objectives text[] not null default '{}',
  prerequisites text[] default '{}',
  mentor jsonb not null, -- Stores mentor configuration
  progress numeric(5,2) default 0 check (progress >= 0 and progress <= 100),
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  time_estimate interval,
  space_color jsonb, -- Stores color theme
  content text, -- Markdown content
  methodology text,
  is_collapsed boolean default false
)
```

#### Fields Description
- `goal_id`: Reference to parent goal
- `user_id`: Reference to space owner
- `objectives`: Array of learning objectives
- `prerequisites`: Array of prerequisites
- `mentor`: Mentor configuration and personality
- `space_color`: UI color theme
- `methodology`: Learning/achievement methodology

### 3. Documents (`documents`)
Knowledge base entries and generated content.

```sql
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
  metadata jsonb -- Additional document metadata
)
```

#### Fields Description
- `space_id`: Reference to associated space
- `type`: Document type
- `tags`: Array of tags for categorization
- `is_generated`: Whether document was AI-generated
- `metadata`: Additional document information

### 4. Tasks (`tasks`)
To-do lists and task tracking.

```sql
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
)
```

### 5. Chat Messages (`chat_messages`)
Stores conversations with mentors.

```sql
create table chat_messages (
  id uuid default uuid_generate_v4() primary key,
  space_id uuid references spaces(id) not null,
  user_id uuid references users(id) not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_faez boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb -- Additional message metadata
)
```

## Security Policies

### Row Level Security (RLS)
```sql
-- Goals
create policy "Users can read own goals"
  on goals for select using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on goals for insert with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on goals for update using (auth.uid() = user_id);

-- Spaces
create policy "Users can read own spaces"
  on spaces for select using (auth.uid() = user_id);

create policy "Users can insert own spaces"
  on spaces for insert with check (auth.uid() = user_id);

create policy "Users can update own spaces"
  on spaces for update using (auth.uid() = user_id);

-- Documents
create policy "Users can read own documents"
  on documents for select using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert with check (auth.uid() = user_id);

-- Tasks
create policy "Users can read own tasks"
  on tasks for select using (auth.uid() = user_id);

create policy "Users can manage own tasks"
  on tasks for all using (auth.uid() = user_id);

-- Chat Messages
create policy "Users can read own messages"
  on chat_messages for select using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on chat_messages for insert with check (auth.uid() = user_id);
```

## Functions and Triggers

### Update Progress
```sql
-- Function to update goal progress based on space progress
create function update_goal_progress()
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

-- Function to update space progress based on task completion
create function update_space_progress()
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
```

## Indexes
```sql
-- Goals
create index goals_user_id_idx on goals(user_id);
create index goals_status_idx on goals(status);
create index goals_category_idx on goals(category);

-- Spaces
create index spaces_goal_id_idx on spaces(goal_id);
create index spaces_user_id_idx on spaces(user_id);
create index spaces_status_idx on spaces(status);

-- Documents
create index documents_space_id_idx on documents(space_id);
create index documents_type_idx on documents(type);
create index documents_tags_idx on documents using gin(tags);

-- Tasks
create index tasks_space_id_idx on tasks(space_id);
create index tasks_status_idx on tasks(status);
create index tasks_order_idx on tasks(space_id, order_index);

-- Chat Messages
create index chat_messages_space_id_idx on chat_messages(space_id);
create index chat_messages_created_at_idx on chat_messages(created_at);
```

## Relationships

### Goals
- One user can have many goals
- Each goal can have multiple spaces
- Goals track overall progress from associated spaces

### Spaces
- Each space belongs to one goal
- One user can have multiple spaces
- Spaces contain documents, tasks, and chat messages
- Space progress is calculated from task completion

### Documents
- Each document belongs to one space
- Documents are categorized by type and tags
- Documents can be user-created or AI-generated

### Tasks
- Each task belongs to one space
- Tasks can have dependencies on other tasks
- Task completion affects space progress

### Chat Messages
- Messages are associated with a space
- Messages track conversations with mentors and Faez
- Messages can be converted to documents 