/**
 * Dynamic config layered over app.json.
 *
 * It exists for one reason: `google-services.json` must not live in this
 * repository, which is public. That file carries the Firebase Android API key,
 * and while the key is not confidential — it ships inside every APK, so anyone
 * with the app can read it — publishing it invites automated abuse, and GitHub
 * flags it. The real protection is restricting the key in Google Cloud (Android
 * package + SHA-1, and only the FCM Registration and Firebase Installations
 * APIs); keeping it out of git removes the easy harvest on top of that.
 *
 * On EAS the file arrives as a secret file variable and `GOOGLE_SERVICES_JSON`
 * holds the path it was written to on the build runner. Locally the variable is
 * unset, so it falls back to the untracked copy in the project root — which
 * keeps `npx expo` and `prebuild` working exactly as before.
 *
 *   npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file \
 *     --visibility secret --value ./google-services.json --scope project \
 *     --environment production --environment preview --environment development
 *
 * Everything else still comes from app.json; only this one field is computed.
 */
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
