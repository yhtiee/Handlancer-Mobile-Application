# Push notifications — the things that must all be true

Notification rows are written by Postgres triggers and always show up in the
in-app list. Getting one onto the phone's tray needs all of the below. When any
one is missing everything still *looks* healthy — the row is saved, the badge
updates, the phone stays silent.

Settings → Notifications → **Enable on this device** reports which one is broken.

### 1. Android: Firebase (FCM) must be configured

**This is what was actually missing.** Accepting the permission prompt proves
nothing: `getExpoPushTokenAsync()` runs *after* it, and without FCM it throws.
The old code swallowed that, so `profiles.push_token` stayed null while the
whole server side sat healthy and idle.

Per the [FCM credentials docs](https://docs.expo.dev/push-notifications/fcm-credentials/),
Android needs both halves:

- **Client:** `google-services.json` from the Firebase console, saved at the
  project root and referenced from `app.json` as
  `expo.android.googleServicesFile: "./google-services.json"`. Without it the app
  is never registered with FCM. It must be present *before* the build.
- **Server:** an FCM V1 service account key uploaded to EAS, so Expo's servers
  are allowed to send. `eas credentials` → Android → Google Service Account →
  *Manage your Google Service Account Key for Push Notifications (FCM V1)*.

Rebuild after adding these — neither can be applied to an existing binary.

### 2. The app must not be running in Expo Go

Remote push was removed from Expo Go in SDK 53
([docs](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/)). `npm start`
runs `expo start --go`, so push cannot work in *that* mode either.

As a stopgap the app raises a *local* notification for every row that arrives
over the realtime channel, which works in Expo Go while the app is running. It
cannot fire when the app is backgrounded or killed.

```bash
npm run build:android:preview   # APK, internal distribution
npm run start:dev               # Metro for a dev-client build (not --go)
```

### 3. The device must hold an Expo push token

Issued after the permission prompt, *if* section 1 is done. Stored on
`profiles.push_token`. `select count(*) from profiles where push_token is not null`
is the fastest way to tell whether any device has ever registered.

### 4. The delivery trigger must exist

`on_notification_push` on `notifications`, from migration `0016`. Apply
migrations with `supabase db push`. **Verified present.**

### 5. The Vault must hold the hook URL and secret

`notify_push()` reads both from Vault and **no-ops silently** when either is
missing — deliberately, so a delivery problem can never roll back the
notification itself. **Verified present**, and the Vault secret's sha256 matches
the Edge Function's `PUSH_HOOK_SECRET` digest.

Set them once, on a fresh project:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push', 'push_hook_url');
select vault.create_secret('<a long random string>', 'push_hook_secret');
```

Then give the Edge Function the same secret and deploy it:

```bash
supabase secrets set PUSH_HOOK_SECRET='<the same long random string>'
supabase functions deploy send-push
```

Postgres calls the function with no user JWT, so the `x-push-secret` header is
what authenticates the caller. `config.toml` already sets `verify_jwt = false`
for `send-push`, so the deploy honours it without `--no-verify-jwt`.

## Checking it from a psql prompt

```sql
select
  (select count(*) from pg_trigger where tgname = 'on_notification_push')      as trigger_installed,
  (select count(*) from vault.secrets where name = 'push_hook_url')            as url_set,
  (select count(*) from vault.secrets where name = 'push_hook_secret')         as secret_set,
  (select count(*) from profiles where push_token is not null)                 as devices_registered;
```

`devices_registered = 0` alongside a healthy trigger and Vault means the problem
is on the device, not the server — section 1.
