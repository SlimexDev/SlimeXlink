begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
alter table public.account_access enable row level security;
revoke all on public.account_access from anon, authenticated;
grant select on public.account_access to authenticated;
grant all on public.account_access to service_role;
create policy read_own_access on public.account_access for select to authenticated using (user_id = (select auth.uid()));

-- Narrow definer helper avoids recursive policies; it never accepts another user's ID.
create function private.active_account() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.account_access where user_id = (select auth.uid()) and status = 'active');
$$;
revoke all on function private.active_account() from public, anon;
grant execute on function private.active_account() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  avatar_path text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy read_own_profile on public.profiles for select to authenticated using (id = (select auth.uid()) and (select private.active_account()));
create policy update_own_profile on public.profiles for update to authenticated using (id = (select auth.uid()) and (select private.active_account())) with check (id = (select auth.uid()) and (select private.active_account()));

create function private.provision_account() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_access(user_id) values(new.id) on conflict do nothing;
  insert into public.profiles(id, display_name) values(new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'),80),''),'SlimeXlink user')) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.provision_account() from public, anon, authenticated;
create trigger provision_slimex_account after insert on auth.users for each row execute function private.provision_account();
insert into public.account_access(user_id) select id from auth.users on conflict do nothing;
insert into public.profiles(id,display_name) select id,'SlimeXlink user' from auth.users on conflict do nothing;

create table private.rate_limit_buckets (
  key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
alter table private.rate_limit_buckets enable row level security;
revoke all on private.rate_limit_buckets from public, anon, authenticated;
-- Public schema RPC is intentionally executable by service_role only.
create function public.consume_auth_limit(bucket_key text, max_attempts integer, window_seconds integer) returns boolean language plpgsql security definer set search_path = '' as $$
declare current_attempts integer;
begin
  if bucket_key !~ '^[0-9a-f]{64}$' or max_attempts < 1 or max_attempts > 100 or window_seconds < 1 or window_seconds > 3600 then
    raise exception 'Invalid limiter arguments';
  end if;
  delete from private.rate_limit_buckets where expires_at < now() - interval '1 day';
  insert into private.rate_limit_buckets as buckets(key,attempts,expires_at)
    values(bucket_key,1,now() + make_interval(secs => window_seconds))
  on conflict(key) do update set
    attempts = case when buckets.expires_at <= now() then 1 else least(buckets.attempts + 1,max_attempts + 1) end,
    expires_at = case when buckets.expires_at <= now() then now() + make_interval(secs => window_seconds) else buckets.expires_at end
  returning attempts into current_attempts;
  return current_attempts <= max_attempts;
end;
$$;
revoke all on function public.consume_auth_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_auth_limit(text,integer,integer) to service_role;
commit;
