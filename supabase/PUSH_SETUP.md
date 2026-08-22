# Push notifications — the four things that must all be true

Notification rows are written by Postgres triggers and always show up in the
in-app list. Getting one onto the phone's tray needs all four of these. When any
one is missing everything still *looks* healthy — the row is saved, the badge
updates, the phone stays silent.

Settings → Notifications → **Enable on this device** reports which one is broken.

### 1. The app must not be running in Expo Go

Remote push was removed from Expo Go in SDK 53
([docs](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/)). `npm start`
runs `expo start --go`, so **push cannot work in that mode** — Expo never issues
a token, `profiles.push_token` stays null, and `send-push` logs
`no push token for user`.

As a stopgap the app now raises a *local* notification for every row that arrives
over the realtime channel, which works in Expo Go while the app is running. It
cannot fire when the app is backgrounded or killed.

For real push, build once and install that instead:

```bash
npm run build:android:preview   # APK, internal distribution
npm run start:dev               # Metro for a dev/preview build
```

iOS needs `eas build` (or `eas go`) for the same reason.

### 2. The device must hold an Expo push token

Granted automatically on a dev/preview build after the permission prompt. Stored
on `profiles.push_token`.

### 3. The delivery trigger must exist

`on_notification_push` on `notifications`, from migration `0016`. Apply
migrations with `supabase db push`.

### 4. The Vault must hold the hook URL and secret

`notify_push()` reads both from Vault and **no-ops silently** when either is
missing — deliberately, so a delivery problem can never roll back the
notification itself. Set them once:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push', 'push_hook_url');
select vault.create_secret('<a long random string>', 'push_hook_secret');
```

Then give the Edge Function the same secret and deploy it:

```bash
supabase secrets set PUSH_HOOK_SECRET='<the same long random string>'
supabase functions deploy send-push --no-verify-jwt
```

`--no-verify-jwt` is required: Postgres calls the function with no user JWT, so
the `x-push-secret` header is what authenticates the caller.
