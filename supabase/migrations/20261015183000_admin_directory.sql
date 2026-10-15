create view public.admin_directory with (security_invoker=true) as
select p.id,p.display_name,p.created_at,a.role,a.status
from public.profiles p join public.account_access a on a.user_id=p.id
where private.is_admin();
revoke all on public.admin_directory from public,anon;
grant select on public.admin_directory to authenticated,service_role;
notify pgrst,'reload schema';
