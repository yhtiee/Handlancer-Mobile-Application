-- Close a privilege hole opened by 0009.
--
-- Supabase ships ALTER DEFAULT PRIVILEGES that grant EXECUTE on every new
-- function in `public` to anon, authenticated AND service_role. 0009 revoked from
-- `public` and `authenticated` but not from `anon`, and revoking from PUBLIC does
-- not remove a role's own explicit grant — so the admin settlement functions were
-- callable by anyone holding the anon key, which ships inside the mobile bundle.
--
-- Verified before this migration: POST /rest/v1/rpc/admin_refund_dispute with the
-- anon key reached the function body and failed only on 'Job not found'.
--
-- These functions have no auth.uid() check by design (there is no in-app admin),
-- so the grant is the only thing protecting them. It has to be exact.

revoke all on function admin_resolve_dispute(uuid, numeric, text) from public, anon, authenticated;
revoke all on function admin_refund_dispute(uuid, text)           from public, anon, authenticated;
revoke all on function admin_release_dispute(uuid, text)          from public, anon, authenticated;

grant execute on function admin_resolve_dispute(uuid, numeric, text) to service_role;
grant execute on function admin_refund_dispute(uuid, text)           to service_role;
grant execute on function admin_release_dispute(uuid, text)          to service_role;
