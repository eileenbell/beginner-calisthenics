-- LOCAL TESTING ONLY. Never run this against a hosted Supabase project.
--
-- Recreates the small part of the Supabase platform that FORM's migrations
-- rely on, so they can run unchanged on a plain Postgres server: the auth
-- schema with auth.users and auth.uid(), and the anon / authenticated /
-- service_role / authenticator roles used by PostgREST.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'authenticator';
  end if;
end;
$$;

grant anon, authenticated, service_role to authenticator;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Same behaviour as Supabase: the user id comes from the verified JWT that
-- PostgREST places in request.jwt.claims.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase's default privileges, so revokes in the migrations are meaningful.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Tokens for the local auth stand-in (password recovery links). Not part of Supabase.
create table if not exists auth.local_one_time_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  code_challenge text,
  redirect_to text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists auth.local_refresh_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

create table if not exists auth.local_auth_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_challenge text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
