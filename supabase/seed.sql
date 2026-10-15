-- Development only. Create a disposable @example.test account first.
-- SET slimex.environment = 'development';
-- SET slimex.seed_owner = '<disposable test user UUID>';
do $$
declare owner uuid; record_id uuid;
begin
 if current_setting('slimex.environment',true) is distinct from 'development' then raise exception 'Development seed requires explicit environment opt-in'; end if;
 owner:=nullif(current_setting('slimex.seed_owner',true),'')::uuid;
 if not exists(select 1 from auth.users where id=owner and email like '%@example.test') then raise exception 'Use a disposable example.test account'; end if;
 insert into public.links(owner_id,slug,title,description,listed)
 values(owner,'development-example','[DEV] Link minh họa / Example link','Dữ liệu phát triển có nhãn. Không dùng trong production.',true)
 on conflict(slug) do nothing returning id into record_id;
 if record_id is not null then
  insert into public.link_targets(link_id,url) values(record_id,'https://example.com/development-content');
  insert into public.link_tasks(link_id,title,url,position) values(record_id,'[DEV] Truy cập example.org','https://example.org',0);
 end if;
end;
$$;
