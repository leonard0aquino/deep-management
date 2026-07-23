begin;

drop trigger if exists audit_notification_preferences on public.notification_preferences;
drop trigger if exists audit_notifications on public.notifications;

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor, diff)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    auth.uid(),
    case
      when TG_OP = 'DELETE' then to_jsonb(old)
      when TG_OP = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else to_jsonb(new)
    end
  );
  return coalesce(new, old);
end;
$$;

commit;
