begin;
create function public.replace_avatar(owner_id uuid, previous_path text, next_path text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  perform 1 from public.account_access where user_id=owner_id and status='active' for share;
  if not found then return false; end if;
  if next_path !~ ('^' || owner_id::text || '/[0-9a-f-]{36}[.](png|jpg|webp)$') or next_path is not distinct from previous_path then
    raise exception 'Invalid avatar path';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='avatars' and name=next_path) then
    raise exception 'Avatar object missing';
  end if;
  update public.profiles set avatar_path=next_path where id=owner_id and avatar_path is not distinct from previous_path;
  get diagnostics changed = row_count;
  return changed=1;
end;
$$;
revoke all on function public.replace_avatar(uuid,text,text) from public,anon,authenticated;
grant execute on function public.replace_avatar(uuid,text,text) to service_role;
commit;
