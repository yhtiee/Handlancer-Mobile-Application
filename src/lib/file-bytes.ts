import { File } from 'expo-file-system';

/**
 * Smallest plausible image. The bug this guards against produced 14-byte objects
 * that uploaded successfully and rendered blank, so anything near-zero is treated
 * as a failed read rather than a valid tiny file.
 */
const MIN_UPLOAD_BYTES = 256;

/**
 * Read a picked local file's real bytes, ready for Supabase Storage.
 *
 * Do NOT go back to `fetch(uri).then(r => r.arrayBuffer())`. Under React Native
 * that silently yields an all-but-empty buffer for `file://` URIs: uploads return
 * success, storage holds a 14-byte object, and every thumbnail renders blank with
 * no error anywhere to trace. The expo-file-system File API reads the file
 * directly and has no such gap.
 */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  const bytes = await new File(uri).bytes();
  if (!bytes || bytes.byteLength < MIN_UPLOAD_BYTES) {
    throw new Error('That file could not be read. Please pick it again.');
  }
  return bytes;
}
