-- Make "why did no push arrive?" answerable from inside the app.
--
-- Push has four independent halves, and when one is missing everything still
-- looks healthy: the notification row is written, the in-app list updates, and
-- the phone stays silent. The halves are
--   1. the device holds an Expo push token          (profiles.push_token)
--   2. the delivery trigger from 0016 is installed  (on_notification_push)
--   3. the Vault holds push_hook_url                (else notify_push no-ops)
--   4. the Vault holds push_hook_secret             (else notify_push no-ops)
--
-- 0016 deliberately makes 3 and 4 silent no-ops so a missing secret can never
-- fail an INSERT. That is right, but it left no way to see the misconfiguration.
-- This exposes the four booleans — never the secret, never the URL.

create or replace function push_diagnostics()
returns table (
  has_token         boolean,
  trigger_installed boolean,
  hook_url_set      boolean,
  hook_secret_set   boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    boolean := false;
  v_secret boolean := false;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  -- Vault may be absent on a local stack; that is a "not configured", not an error.
  begin
    select exists (select 1 from vault.decrypted_secrets where name = 'push_hook_url'),
           exists (select 1 from vault.decrypted_secrets where name = 'push_hook_secret')
      into v_url, v_secret;
  exception when others then
    v_url := false;
    v_secret := false;
  end;

  return query
  select
    (select p.push_token is not null from profiles p where p.id = auth.uid()),
    exists (select 1 from pg_trigger where tgname = 'on_notification_push'),
    v_url,
    v_secret;
end;
$$;

grant execute on function push_diagnostics() to authenticated;
