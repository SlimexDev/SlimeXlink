begin;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_access where user_id=(select auth.uid()) and role='admin' and status='active');
$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
create policy admin_read_access on public.account_access for select to authenticated using((select private.is_admin()));
create policy admin_read_profiles on public.profiles for select to authenticated using((select private.is_admin()));
create function private.valid_web_url(value text) returns boolean language sql immutable set search_path='' as $$
 select value is not null and length(value) between 8 and 2048 and value ~ '^https?://[^/@[:space:]]+([/?#].*)?$' and value !~ '[[:cntrl:][:space:]]';
$$;
revoke all on function private.valid_web_url(text) from public,anon;
grant execute on function private.valid_web_url(text) to authenticated;

create table public.links(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
 title text not null check(length(btrim(title)) between 1 and 120), description text not null default '' check(length(description)<=2000),
 image_path text, listed boolean not null default false, enabled boolean not null default true, expires_at timestamptz,
 revision integer not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index links_owner_created on public.links(owner_id,created_at desc);
create index links_discover on public.links(listed,enabled,created_at desc);
create table public.link_targets(link_id uuid primary key references public.links(id) on delete cascade, url text not null check(private.valid_web_url(url)));
create table public.link_tasks(
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.links(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 80), url text not null check(private.valid_web_url(url)),
 position integer not null check(position between 0 and 9), kind text not null default 'visit' check(kind='visit'), unique(link_id,position)
);
create table public.unlock_sessions(
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.links(id) on delete cascade,
 visitor_hash text not null check(visitor_hash ~ '^[0-9a-f]{64}$'), revision integer not null,
 expires_at timestamptz not null default now()+interval '30 minutes', created_at timestamptz not null default now(),
 token_hash text, token_expires_at timestamptz, consumed_at timestamptz
);
create index unlock_session_lookup on public.unlock_sessions(link_id,visitor_hash,revision,expires_at);
create table public.task_results(
 session_id uuid not null references public.unlock_sessions(id) on delete cascade,
 task_id uuid not null references public.link_tasks(id) on delete cascade,
 attempt_id uuid not null default gen_random_uuid(), status text not null check(status in ('running','failed','done')),
 required_seconds integer not null check(required_seconds between 4 and 8), started_at timestamptz not null default clock_timestamp(), completed_at timestamptz,
 primary key(session_id,task_id)
);
create table public.link_events(
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.links(id) on delete cascade,
 session_id uuid references public.unlock_sessions(id) on delete set null, visitor_hash text not null,
 kind text not null check(kind in ('view','unlock')), event_day date not null default (now() at time zone 'UTC')::date,
 created_at timestamptz not null default now(), unique(link_id,visitor_hash,kind,event_day)
);
create index link_events_range on public.link_events(link_id,event_day);
create table public.reports(
 id uuid primary key default gen_random_uuid(), link_id uuid references public.links(id) on delete set null,
 slug text not null, reason text not null check(reason in ('scam','malware','copyright','other')),
 details text not null check(length(details) between 10 and 2000), reporter_hash text not null,
 status text not null default 'open' check(status in ('open','resolved')), created_at timestamptz not null default now()
);
create table public.contact_messages(
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80),
 email text not null check(length(email)<=254), message text not null check(length(message) between 10 and 2000), created_at timestamptz not null default now()
);
create table public.admin_audit(
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
 action text not null, target_id uuid not null, reason text not null check(length(reason) between 3 and 500), created_at timestamptz not null default now()
);
alter table public.links enable row level security;
alter table public.link_targets enable row level security;
alter table public.link_tasks enable row level security;
alter table public.unlock_sessions enable row level security;
alter table public.task_results enable row level security;
alter table public.link_events enable row level security;
alter table public.reports enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.links,public.link_targets,public.link_tasks,public.unlock_sessions,public.task_results,public.link_events,public.reports,public.contact_messages,public.admin_audit from anon,authenticated;
grant select on public.links,public.link_targets,public.link_tasks,public.link_events,public.reports,public.contact_messages,public.admin_audit to authenticated;
grant all on public.links,public.link_targets,public.link_tasks,public.unlock_sessions,public.task_results,public.link_events,public.reports,public.contact_messages,public.admin_audit to service_role;
create policy owner_read_links on public.links for select to authenticated using((owner_id=(select auth.uid()) and (select private.active_account())) or (select private.is_admin()));
create policy owner_read_targets on public.link_targets for select to authenticated using(exists(select 1 from public.links where id=link_id and owner_id=(select auth.uid())) and (select private.active_account()));
create policy owner_read_tasks on public.link_tasks for select to authenticated using(exists(select 1 from public.links where id=link_id and owner_id=(select auth.uid())) and (select private.active_account()));
create policy owner_read_events on public.link_events for select to authenticated using(exists(select 1 from public.links where id=link_id and owner_id=(select auth.uid())) and (select private.active_account()));
create policy admin_read_reports on public.reports for select to authenticated using((select private.is_admin()));
create policy admin_read_contacts on public.contact_messages for select to authenticated using((select private.is_admin()));
create policy admin_read_audit on public.admin_audit for select to authenticated using((select private.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('link-images','link-images',true,1048576,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=1048576,allowed_mime_types=excluded.allowed_mime_types;

create function public.save_link(payload jsonb, record_id uuid default null, expected_revision integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result_id uuid; entry jsonb; ordinal bigint; expiry timestamptz; image text;
begin
 perform 1 from public.account_access where user_id=actor and status='active' for share;
 if not found then raise exception 'FORBIDDEN'; end if;
 if not public.consume_auth_limit(repeat(md5('save-link:'||actor::text),2),30,900) then raise exception 'RATE_LIMITED'; end if;
 if length(btrim(payload->>'title')) not between 1 and 120 or length(coalesce(payload->>'description',''))>2000
    or (payload->>'slug') !~ '^[a-z0-9][a-z0-9-]{2,63}$' or not private.valid_web_url(payload->>'destination')
    or jsonb_typeof(payload->'tasks') is distinct from 'array' then raise exception 'INVALID_INPUT'; end if;
 if jsonb_array_length(payload->'tasks') not between 1 and 10 then raise exception 'INVALID_TASKS'; end if;
 expiry:=nullif(payload->>'expiresAt','')::timestamptz; image:=nullif(payload->>'imagePath','');
 if image is not null and (image !~ ('^'||actor::text||'/[0-9a-f-]{36}[.](png|jpg|webp)$') or not exists(select 1 from storage.objects where bucket_id='link-images' and name=image)) then raise exception 'INVALID_IMAGE'; end if;
 if record_id is null then
  insert into public.links(owner_id,slug,title,description,image_path,listed,enabled,expires_at)
  values(actor,payload->>'slug',btrim(payload->>'title'),coalesce(payload->>'description',''),image,coalesce((payload->>'listed')::boolean,false),coalesce((payload->>'enabled')::boolean,true),expiry) returning id into result_id;
 else
  update public.links set slug=payload->>'slug',title=btrim(payload->>'title'),description=coalesce(payload->>'description',''),image_path=image,
   listed=coalesce((payload->>'listed')::boolean,false),enabled=coalesce((payload->>'enabled')::boolean,true),expires_at=expiry,revision=revision+1,updated_at=now()
   where id=record_id and owner_id=actor and revision=expected_revision returning id into result_id;
  if result_id is null then raise exception 'CONFLICT_OR_FORBIDDEN'; end if;
 end if;
 insert into public.link_targets(link_id,url) values(result_id,payload->>'destination') on conflict(link_id) do update set url=excluded.url;
 delete from public.link_tasks where link_id=result_id;
 for entry,ordinal in select value,ordinality from jsonb_array_elements(payload->'tasks') with ordinality loop
  if length(btrim(entry->>'title')) not between 1 and 80 or not private.valid_web_url(entry->>'url') then raise exception 'INVALID_TASKS'; end if;
  insert into public.link_tasks(link_id,title,url,position) values(result_id,btrim(entry->>'title'),entry->>'url',ordinal-1);
 end loop;
 return result_id;
end;
$$;
revoke all on function public.save_link(jsonb,uuid,integer) from public,anon;
grant execute on function public.save_link(jsonb,uuid,integer) to authenticated;
create function public.delete_link(record_id uuid, expected_revision integer) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.account_access where user_id=auth.uid() and status='active' for share;
 if not found then raise exception 'FORBIDDEN'; end if;
 delete from public.links where id=record_id and owner_id=auth.uid() and revision=expected_revision;
 return found;
end;
$$;
revoke all on function public.delete_link(uuid,integer) from public,anon;
grant execute on function public.delete_link(uuid,integer) to authenticated;

create function private.lock_available(link_uuid uuid) returns public.links language plpgsql security definer set search_path='' as $$
declare record public.links;
begin
 select * into record from public.links where id=link_uuid for update;
 if not found then raise exception 'LINK_NOT_FOUND'; end if;
 if not record.enabled then raise exception 'LINK_DISABLED'; end if;
 if record.expires_at is not null and record.expires_at<=clock_timestamp() then raise exception 'LINK_EXPIRED'; end if;
 perform 1 from public.account_access where user_id=record.owner_id and status='active' for share;
 if not found then raise exception 'LINK_UNAVAILABLE'; end if;
 return record;
end;
$$;
revoke all on function private.lock_available(uuid) from public,anon,authenticated;
create function private.lock_session(session_uuid uuid, visitor text) returns public.unlock_sessions language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; link_record public.links;
begin
 select * into record from public.unlock_sessions where id=session_uuid;
 if not found or record.visitor_hash is distinct from visitor then raise exception 'INVALID_SESSION'; end if;
 link_record:=private.lock_available(record.link_id);
 select * into record from public.unlock_sessions where id=session_uuid for update;
 if not found or record.expires_at<=clock_timestamp() or record.revision<>link_record.revision then raise exception 'SESSION_EXPIRED'; end if;
 return record;
end;
$$;
revoke all on function private.lock_session(uuid,text) from public,anon,authenticated;
create function public.open_unlock_session(link_uuid uuid, visitor text) returns uuid language plpgsql security definer set search_path='' as $$
declare record public.links; session_uuid uuid;
begin
 if visitor !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_VISITOR'; end if;
 if not public.consume_auth_limit(repeat(md5('open:'||visitor),2),50,60) or not public.consume_auth_limit(repeat(md5('open-link:'||link_uuid::text),2),100,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_available(link_uuid);
 perform pg_advisory_xact_lock(hashtextextended(link_uuid::text||visitor,0));
 select id into session_uuid from public.unlock_sessions where link_id=link_uuid and visitor_hash=visitor and revision=record.revision and expires_at>clock_timestamp() order by created_at desc limit 1;
 if session_uuid is null then insert into public.unlock_sessions(link_id,visitor_hash,revision) values(link_uuid,visitor,record.revision) returning id into session_uuid; end if;
 insert into public.link_events(link_id,session_id,visitor_hash,kind) values(link_uuid,session_uuid,visitor,'view') on conflict do nothing;
 return session_uuid;
end;
$$;
revoke all on function public.open_unlock_session(uuid,text) from public,anon,authenticated;
grant execute on function public.open_unlock_session(uuid,text) to service_role;
create function public.start_link_task(session_uuid uuid, visitor text, task_uuid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; task public.link_tasks; attempt public.task_results;
begin
 if not public.consume_auth_limit(repeat(md5('task:'||visitor),2),60,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_session(session_uuid,visitor);
 select * into task from public.link_tasks where id=task_uuid and link_id=record.link_id;
 if not found then raise exception 'INVALID_TASK'; end if;
 select * into attempt from public.task_results where session_id=session_uuid and task_id=task_uuid;
 if found and attempt.status='done' then return jsonb_build_object('status','done'); end if;
 if attempt.status='running' then return jsonb_build_object('status','running','attemptId',attempt.attempt_id,'seconds',attempt.required_seconds,'url',task.url); end if;
 insert into public.task_results(session_id,task_id,status,required_seconds) values(session_uuid,task_uuid,'running',4+floor(random()*5)::integer)
 on conflict(session_id,task_id) do update set status='running',attempt_id=gen_random_uuid(),required_seconds=4+floor(random()*5)::integer,started_at=clock_timestamp(),completed_at=null returning * into attempt;
 return jsonb_build_object('status','running','attemptId',attempt.attempt_id,'seconds',attempt.required_seconds,'url',task.url);
end;
$$;
revoke all on function public.start_link_task(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.start_link_task(uuid,text,uuid) to service_role;
create function public.finish_link_task(session_uuid uuid, visitor text, task_uuid uuid, attempt_uuid uuid) returns text language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; attempt public.task_results;
begin
 if not public.consume_auth_limit(repeat(md5('finish:'||visitor),2),60,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_session(session_uuid,visitor);
 select * into attempt from public.task_results where session_id=session_uuid and task_id=task_uuid for update;
 if not found or attempt.attempt_id<>attempt_uuid then raise exception 'INVALID_ATTEMPT'; end if;
 if attempt.status='done' then return 'done'; end if;
 if attempt.status='failed' then return 'failed'; end if;
 if clock_timestamp()<attempt.started_at+make_interval(secs=>attempt.required_seconds) then
  update public.task_results set status='failed' where session_id=session_uuid and task_id=task_uuid; return 'failed';
 end if;
 update public.task_results set status='done',completed_at=clock_timestamp() where session_id=session_uuid and task_id=task_uuid;
 return 'done';
end;
$$;
revoke all on function public.finish_link_task(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_link_task(uuid,text,uuid,uuid) to service_role;
create function private.require_completed(record public.unlock_sessions) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.link_tasks where link_id=record.link_id) or exists(select 1 from public.link_tasks t where t.link_id=record.link_id and not exists(select 1 from public.task_results r where r.task_id=t.id and r.session_id=record.id and r.status='done')) then raise exception 'TASKS_INCOMPLETE'; end if;
end;
$$;
revoke all on function private.require_completed(public.unlock_sessions) from public,anon,authenticated;
create function public.issue_unlock(session_uuid uuid, visitor text, link_uuid uuid, grant_hash text) returns void language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions;
begin
 if not public.consume_auth_limit(repeat(md5('grant:'||visitor),2),20,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_session(session_uuid,visitor);
 if record.link_id<>link_uuid or grant_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_GRANT'; end if;
 perform private.require_completed(record);
 update public.unlock_sessions set token_hash=grant_hash,token_expires_at=clock_timestamp()+interval '60 seconds',consumed_at=null where id=session_uuid;
end;
$$;
revoke all on function public.issue_unlock(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.issue_unlock(uuid,text,uuid,text) to service_role;
create function public.consume_unlock(session_uuid uuid, visitor text, link_uuid uuid, grant_hash text) returns text language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; destination text;
begin
 record:=private.lock_session(session_uuid,visitor);
 if record.link_id<>link_uuid or record.token_hash is distinct from grant_hash or record.token_hash is null or record.token_expires_at<=clock_timestamp() or record.consumed_at is not null then raise exception 'INVALID_GRANT'; end if;
 perform private.require_completed(record);
 select url into destination from public.link_targets where link_id=link_uuid;
 if destination is null then raise exception 'TARGET_UNAVAILABLE'; end if;
 update public.unlock_sessions set consumed_at=clock_timestamp(),token_hash=null where id=session_uuid;
 insert into public.link_events(link_id,session_id,visitor_hash,kind) values(link_uuid,session_uuid,visitor,'unlock') on conflict do nothing;
 return destination;
end;
$$;
revoke all on function public.consume_unlock(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.consume_unlock(uuid,text,uuid,text) to service_role;

create function public.moderate_record(operation text, record_id uuid, enabled_value boolean, explanation text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() or length(btrim(explanation)) not between 3 and 500 then raise exception 'FORBIDDEN'; end if;
 if operation='link' then update public.links set enabled=enabled_value,revision=revision+1,updated_at=now() where id=record_id;
 elsif operation='account' then update public.account_access set status=case when enabled_value then 'active' else 'suspended' end where user_id=record_id and role='member';
 elsif operation='report' then update public.reports set status='resolved' where id=record_id;
 else raise exception 'INVALID_OPERATION'; end if;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into public.admin_audit(actor_id,action,target_id,reason) values(auth.uid(),operation||case when enabled_value then ':enable' else ':disable' end,record_id,btrim(explanation));
end;
$$;
revoke all on function public.moderate_record(text,uuid,boolean,text) from public,anon;
grant execute on function public.moderate_record(text,uuid,boolean,text) to authenticated;

create function public.cleanup_expired_data() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.unlock_sessions where expires_at<now()-interval '1 day';
 delete from public.link_events where event_day<(now() at time zone 'UTC')::date-90;
 delete from private.rate_limit_buckets where expires_at<now()-interval '1 day';
 delete from public.reports where status='resolved' and created_at<now()-interval '180 days';
 delete from public.contact_messages where created_at<now()-interval '90 days';
 delete from public.admin_audit where created_at<now()-interval '1 year';
end;
$$;
revoke all on function public.cleanup_expired_data() from public,anon,authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
notify pgrst,'reload schema';
commit;
