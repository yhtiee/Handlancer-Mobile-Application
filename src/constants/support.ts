/**
 * Where HandLancer support can be reached.
 *
 * Centralised because the address was hard-coded in two screens and had already
 * drifted from the real mailbox. Anything that offers to contact support — the
 * FAQ screen, the dispute flow — reads it from here.
 */

export const SUPPORT_EMAIL = 'support@handlancer.com';

/** As printed on screen and read aloud, in the local format Nigerians dial. */
export const SUPPORT_WHATSAPP_DISPLAY = '0912 733 6503';

/**
 * The same line in E.164 without the `+`, which is the only form wa.me accepts:
 * a leading 0 is a national trunk prefix and wa.me resolves it to nothing.
 */
const SUPPORT_WHATSAPP_E164 = '2349127336503';

/**
 * A WhatsApp deep link carrying a pre-written message.
 *
 * Deliberately `https://wa.me/…` rather than the `whatsapp://` scheme: it opens
 * the app when installed and falls back to WhatsApp Web in the browser when it
 * is not, so no `canOpenURL` check is needed — which matters on Android, where
 * that call rejects outright without a `queries` entry in the manifest.
 */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
