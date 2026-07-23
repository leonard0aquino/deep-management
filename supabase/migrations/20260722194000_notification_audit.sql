begin;

-- Torna o trigger genérico compatível tanto com tabelas identificadas por
-- `id` quanto com preferências identificadas pelo próprio `user_id`.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row jsonb := case when TG_OP = 'DELETE' then null else to_jsonb(new) end;
  old_row jsonb := case when TG_OP = 'INSERT' then null else to_jsonb(old) end;
  audited_record_id uuid;
begin
  audited_record_id := coalesce(
    nullif(new_row ->> 'id', '')::uuid,
    nullif(old_row ->> 'id', '')::uuid,
    nullif(new_row ->> 'user_id', '')::uuid,
    nullif(old_row ->> 'user_id', '')::uuid
  );

  insert into public.audit_log (table_name, record_id, action, actor, diff)
  values (
    TG_TABLE_NAME,
    audited_record_id,
    TG_OP,
    auth.uid(),
    case
      when TG_OP = 'DELETE' then old_row
      when TG_OP = 'UPDATE' then jsonb_build_object('before', old_row, 'after', new_row)
      else new_row
    end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_notifications on public.notifications;
create trigger audit_notifications
  after insert or update or delete on public.notifications
  for each row execute function public.audit_trigger();

drop trigger if exists audit_notification_preferences on public.notification_preferences;
create trigger audit_notification_preferences
  after insert or update or delete on public.notification_preferences
  for each row execute function public.audit_trigger();

commit;
