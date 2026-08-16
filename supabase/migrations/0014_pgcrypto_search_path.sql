-- Let the PIN functions actually see pgcrypto.
--
-- Supabase pre-installs pgcrypto into the `extensions` schema, so the
-- `create extension if not exists pgcrypto` in 0012 was a no-op and left it
-- there. Both PIN functions declare `set search_path = public`, which means
-- `gen_salt()` and `crypt()` resolve to nothing and every call fails.
--
-- `public, extensions` is correct whichever schema the extension actually lives
-- in, and keeping the explicit search_path preserves the SECURITY DEFINER
-- hardening (an empty/inherited search_path is how definer functions get hijacked).

alter function set_transfer_pin(text, text) set search_path = public, extensions;
alter function request_withdrawal(numeric, text) set search_path = public, extensions;
