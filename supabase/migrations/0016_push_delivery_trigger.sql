-- Deliver every notification row as a push message.
--
-- The missing half of push: triggers in 0004 have always written `notifications`
-- rows and PushRegistrar has always saved a token, but nothing ever contacted
-- Expo — so no push could ever arrive. This calls the send-push Edge Function
-- asynchronously (pg_net) on insert.
--
-- The shared secret lives in Vault, not here, so it stays out of the repo. Until
-- it is set the trigger simply no-ops: pushes stop, nothing else breaks.

create extension if not exists pg_net with schema extensions;

create or replace function notify_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_url    text;
begin
  -- Both are optional on purpose. A missing secret must never make the INSERT
  -- fail: the in-app notification is the source of truth, push is best-effort.
  begin
    select decrypted_secret into v_secret
      from vault.decrypted_secrets where name = 'push_hook_secret' limit 1;
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'push_hook_url' limit 1;
  exception when others then
    return new;
  end;

  if v_secret is null or v_url is null then return new; end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'x-push-secret',  v_secret),
    body    := jsonb_build_object('record', to_jsonb(new)),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- Never let a delivery problem roll back the notification itself.
  return new;
end;
$$;

drop trigger if exists on_notification_push on notifications;
create trigger on_notification_push
  after insert on notifications
  for each row execute function notify_push();
