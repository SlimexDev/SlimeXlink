begin;
alter table public.task_results add column departed_at timestamptz;
create view public.discoverable_links as
select l.id,l.slug,l.title,l.description,l.image_path,l.created_at,l.expires_at
from public.links l join public.account_access a on a.user_id=l.owner_id
where l.listed and l.enabled and (l.expires_at is null or l.expires_at>now()) and a.status='active';
revoke all on public.discoverable_links from public,anon,authenticated;
grant select on public.discoverable_links to service_role;
create or replace function public.start_link_task(session_uuid uuid, visitor text, task_uuid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; task public.link_tasks; attempt public.task_results;
begin
 if not public.consume_auth_limit(repeat(md5('task:'||visitor),2),60,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_session(session_uuid,visitor);
 select * into task from public.link_tasks where id=task_uuid and link_id=record.link_id;
 if not found then raise exception 'INVALID_TASK'; end if;
 select * into attempt from public.task_results where session_id=session_uuid and task_id=task_uuid;
 if found and attempt.status='done' then return jsonb_build_object('status','done'); end if;
 if attempt.status='running' then return jsonb_build_object('status','running','attemptId',attempt.attempt_id,'seconds',attempt.required_seconds,'url',task.url); end if;
 if exists(select 1 from public.task_results where session_id=session_uuid and task_id<>task_uuid and status='running') then raise exception 'TASK_ALREADY_RUNNING'; end if;
 insert into public.task_results(session_id,task_id,status,required_seconds) values(session_uuid,task_uuid,'running',4+floor(random()*5)::integer)
 on conflict(session_id,task_id) do update set status='running',attempt_id=gen_random_uuid(),required_seconds=4+floor(random()*5)::integer,started_at=clock_timestamp(),completed_at=null,departed_at=null returning * into attempt;
 return jsonb_build_object('status','running','attemptId',attempt.attempt_id,'seconds',attempt.required_seconds,'url',task.url);
end;
$$;
revoke all on function public.start_link_task(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.start_link_task(uuid,text,uuid) to service_role;
create or replace function public.finish_link_task(session_uuid uuid, visitor text, task_uuid uuid, attempt_uuid uuid) returns text language plpgsql security definer set search_path='' as $$
declare record public.unlock_sessions; attempt public.task_results;
begin
 if not public.consume_auth_limit(repeat(md5('finish:'||visitor),2),60,60) then raise exception 'RATE_LIMITED'; end if;
 record:=private.lock_session(session_uuid,visitor);
 select * into attempt from public.task_results where session_id=session_uuid and task_id=task_uuid for update;
 if not found or attempt.attempt_id<>attempt_uuid then raise exception 'INVALID_ATTEMPT'; end if;
 if attempt.status='done' then return 'done'; end if;
 if attempt.status='failed' then return 'failed'; end if;
 if attempt.departed_at is null or clock_timestamp()<attempt.departed_at+make_interval(secs=>attempt.required_seconds) then
  update public.task_results set status='failed' where session_id=session_uuid and task_id=task_uuid; return 'failed';
 end if;
 update public.task_results set status='done',completed_at=clock_timestamp() where session_id=session_uuid and task_id=task_uuid;
 return 'done';
end;
$$;
revoke all on function public.finish_link_task(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_link_task(uuid,text,uuid,uuid) to service_role;

create function public.depart_link_task(session_uuid uuid,visitor text,task_uuid uuid,attempt_uuid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.lock_session(session_uuid,visitor);
 update public.task_results set departed_at=coalesce(departed_at,clock_timestamp()) where session_id=session_uuid and task_id=task_uuid and attempt_id=attempt_uuid and status='running';
 if not found then raise exception 'INVALID_ATTEMPT'; end if;
end;
$$;
revoke all on function public.depart_link_task(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.depart_link_task(uuid,text,uuid,uuid) to service_role;
create function public.fail_link_task(session_uuid uuid,visitor text,task_uuid uuid,attempt_uuid uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 perform private.lock_session(session_uuid,visitor);
 update public.task_results set status='failed' where session_id=session_uuid and task_id=task_uuid and attempt_id=attempt_uuid and status='running';
 return 'failed';
end;
$$;
revoke all on function public.fail_link_task(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fail_link_task(uuid,text,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
