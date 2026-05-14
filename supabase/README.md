# Supabase Database Migrations

SQL migration files for the e-commerce store database.

## Running migrations (`npm run db:migrate`)

1. Add **`DATABASE_URL`** (or **`SUPABASE_DB_PASSWORD`** + **`NEXT_PUBLIC_SUPABASE_URL`**) to `.env.local`. Use the **Session pooler** or **direct** connection string from Supabase → Project Settings → Database.
2. Run **`npm run db:migrate`**.

**Why this used to "stop halfway":** Postgres runs an entire `.sql` file as a single batch. The first error (e.g. `type "user_role" already exists`) aborts the rest of the file, so later tables like `profiles` are never created. The migration script now runs the schema **statement-by-statement** and skips harmless "already exists" DDL so the rest can finish.

- **`MIGRATE_STRICT=1`** — old behavior: one query per file (fails on any duplicate).
- **`SKIP_COMPLETE_SCHEMA=1`** — only run the smaller migrations after the main schema file.

## Migration order

Run files in the order they appear in `supabase/migrations/`. Each filename is prefixed with its timestamp so lexical order is correct.

## Method: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Customization

Add new tables to the latest migration file or create a new timestamped migration. Keep RLS policies tight — public read for catalog data only; owner-scoped (`auth.uid() = user_id`) for everything user-specific.

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage)
