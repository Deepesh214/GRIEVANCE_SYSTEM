-- ============================================================
-- Grievance Redressal Management System - Supabase / Postgres schema
-- Run this entire file in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------- USERS ----------------
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  college_id      text not null unique,
  password        text not null,
  role            text not null default 'student' check (role in ('student','officer','admin')),
  department      text,
  phone           text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists users_role_idx on public.users(role);

-- ---------------- GRIEVANCES ----------------
create table if not exists public.grievances (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text not null,
  category            text not null default 'Other',
  priority            text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status              text not null default 'pending'
                        check (status in ('pending','in_progress','awaiting_input','resolved','rejected')),
  raised_by           uuid not null references public.users(id) on delete cascade,
  assigned_to         uuid references public.users(id) on delete set null,
  resolution_summary  text,
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists grievances_status_idx     on public.grievances(status);
create index if not exists grievances_raised_by_idx  on public.grievances(raised_by);
create index if not exists grievances_assigned_idx   on public.grievances(assigned_to);
create index if not exists grievances_created_at_idx on public.grievances(created_at desc);

-- ---------------- ATTACHMENTS / EVIDENCE ----------------
create table if not exists public.grievance_attachments (
  id             uuid primary key default gen_random_uuid(),
  grievance_id   uuid not null references public.grievances(id) on delete cascade,
  kind           text not null check (kind in ('attachment','evidence')),
  filename       text,
  original_name  text,
  mimetype       text,
  size           integer,
  url            text,
  uploaded_at    timestamptz not null default now()
);
create index if not exists attachments_grievance_idx on public.grievance_attachments(grievance_id);

-- ---------------- TIMELINE HISTORY ----------------
create table if not exists public.grievance_history (
  id             uuid primary key default gen_random_uuid(),
  grievance_id   uuid not null references public.grievances(id) on delete cascade,
  by_user        uuid references public.users(id) on delete set null,
  by_name        text,
  by_role        text,
  action         text not null,
  from_value     text,
  to_value       text,
  note           text,
  at             timestamptz not null default now()
);
create index if not exists history_grievance_idx on public.grievance_history(grievance_id, at);

-- ---------------- INTERNAL NOTES ----------------
create table if not exists public.grievance_notes (
  id             uuid primary key default gen_random_uuid(),
  grievance_id   uuid not null references public.grievances(id) on delete cascade,
  by_user        uuid references public.users(id) on delete set null,
  by_name        text,
  note           text not null,
  at             timestamptz not null default now()
);
create index if not exists notes_grievance_idx on public.grievance_notes(grievance_id);

-- ---------------- INVITES ----------------
create table if not exists public.invites (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  phone            text,
  role             text not null check (role in ('admin','officer')),
  token            text not null unique,
  created_by       uuid references public.users(id) on delete set null,
  created_by_name  text,
  expires_at       timestamptz not null,
  used_at          timestamptz,
  used_by          uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists invites_token_idx on public.invites(token);

-- ---------------- NOTIFICATIONS ----------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  grievance_id   uuid references public.grievances(id) on delete set null,
  type           text not null,
  title          text,
  message        text,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------- updated_at triggers ----------------
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists users_touch      on public.users;
create trigger users_touch      before update on public.users      for each row execute function public.touch_updated_at();
drop trigger if exists grievances_touch on public.grievances;
create trigger grievances_touch before update on public.grievances for each row execute function public.touch_updated_at();

-- ---------------- Storage bucket for file uploads ----------------
-- Creates a PUBLIC bucket called 'attachments' so files can be served directly.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Storage policies - allow the service_role (used by the server) to do anything.
-- Public reads are already allowed because the bucket is public=true.
drop policy if exists attachments_insert on storage.objects;
create policy attachments_insert on storage.objects for insert to service_role
  with check (bucket_id = 'attachments');
drop policy if exists attachments_read on storage.objects;
create policy attachments_read   on storage.objects for select using (bucket_id = 'attachments');

-- ---------------- Done ----------------
-- After running this you can verify with:
--   select table_name from information_schema.tables where table_schema='public';
