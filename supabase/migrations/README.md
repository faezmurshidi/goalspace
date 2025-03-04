# Supabase Migrations

This directory contains the database migration files for the Goalspace project.

## Migration Strategy

Our migration strategy follows these principles:

1. **Chronological Ordering**: Migration files are named with UTC timestamps in the format `YYYYMMDDHHmmss_description.sql` to ensure they are executed in the correct order.

2. **Atomic Changes**: Each migration should address a specific set of related changes to make rollbacks safer.

3. **Idempotent Operations**: When possible, migrations use `IF EXISTS` and `IF NOT EXISTS` clauses to prevent errors if the objects already exist.

4. **Forward-Only**: We avoid destructive changes to existing data. If a column or table needs to be removed, we consider versioning or soft deletion.

5. **Security First**: All tables use Row Level Security (RLS) and proper permissions are set for all roles.

## Consolidated Migrations

On April 1, 2024, we consolidated several related migrations to improve maintainability:

- `20240401000000_consolidate_schema_and_permissions.sql` replaces:
  - `20240328000000_align_schema_changes.sql`
  - `20240328100000_fix_permissions.sql`
  - `20240328200000_revoke_unnecessary_permissions.sql`

These files can be safely removed after the consolidated migration has been applied to all environments.

## Naming Conventions

- **Functions**: Use `snake_case` for function names
- **Tables**: Use plural nouns in `snake_case` (e.g., `users`, `blog_posts`)
- **Policies**: Use descriptive names in quotes, indicating their purpose (e.g., "Users can view their own records")
- **Indexes**: Use a consistent pattern like `table_column_idx` (e.g., `users_email_idx`)

## Best Practices

1. **When creating new tables:**
   - Always include `created_at` and `updated_at` columns
   - Always enable Row Level Security (RLS)
   - Create appropriate RLS policies

2. **When creating functions:**
   - Use `SECURITY INVOKER` by default (not `SECURITY DEFINER`)
   - Set `search_path = ''` to avoid injection attacks
   - Use fully qualified names (`schema.table`) for all database objects

3. **When setting permissions:**
   - Grant only the necessary permissions to each role
   - Use `authenticated` role for logged-in users
   - Use `anon` role only for public/unauthenticated access

## Cleaning Up Migrations

Before deploying to production, clean up the migration folder by:

1. Identifying related migrations that can be consolidated
2. Creating a new consolidated migration file
3. Updating this README to document which files were consolidated
4. Testing locally with `supabase db reset`
5. Removing the old migration files only after successful testing

Do not remove migrations that have already been applied to production environments. 