// Client-side helpers that upload bytes to Supabase Storage so the
// extract-recipe Edge Function can fetch them. Used today by the in-app
// Photo and File import tabs. Bot uploads bypass these via the
// service-role client in `telegram-bot/src/bot.ts`.
//
// All paths land in the `telegram-screenshots` bucket under
// `<auth_uid>/<uuid>.<ext>`. The bucket name is historical (predates
// in-app upload) and can be renamed later; behaviour is bucket-agnostic.

import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './client';
import { ApiError } from './auth';

const BUCKET = 'telegram-screenshots';
const SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 minutes — Edge Function fetches within seconds.
const IMAGE_MAX_DIMENSION = 1600; // resize biggest side; smaller sides untouched.
const IMAGE_JPEG_QUALITY = 0.85;
const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB cap per File-tab spec

export interface UploadResult {
  storagePath: string;
  signedUrl: string;
}

/**
 * Resize + compress + upload a single picked photo. Returns a Storage
 * signed URL the caller can pass directly into `extract-recipe` via
 * `image_urls[]`. Throws `ApiError` on failure.
 */
export async function uploadRecipeScreenshot(localUri: string): Promise<UploadResult> {
  const userId = await currentUserId();
  const path = `${userId}/${randomUuid()}.jpg`;

  // Resize first; cheaper than uploading a 12MB camera capture as-is.
  const compressed = await manipulateAsync(
    localUri,
    [{ resize: { width: IMAGE_MAX_DIMENSION } }],
    { compress: IMAGE_JPEG_QUALITY, format: SaveFormat.JPEG },
  );

  const arrayBuffer = await fileToArrayBuffer(compressed.uri);
  return uploadAndSign(path, arrayBuffer, 'image/jpeg');
}

/**
 * Upload a PDF (already validated under PDF_MAX_BYTES on the caller side)
 * and return a signed URL the Edge Function can fetch via the document
 * content block. Throws `ApiError` on size or upload failure.
 */
export async function uploadPdfForExtraction(localUri: string): Promise<UploadResult> {
  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists) throw new ApiError('File not found');
  // Legacy `getInfoAsync` returns `size` by default; the FileInfo type
  // exposes it on the success branch.
  const sizeBytes = (info as { size?: number }).size ?? 0;
  if (sizeBytes > PDF_MAX_BYTES) {
    throw new ApiError('PDF is too large (max 10MB).', 'pdf_too_large');
  }
  const userId = await currentUserId();
  const path = `${userId}/${randomUuid()}.pdf`;
  const arrayBuffer = await fileToArrayBuffer(localUri);
  return uploadAndSign(path, arrayBuffer, 'application/pdf');
}

async function uploadAndSign(
  path: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<UploadResult> {
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (upErr) throw new ApiError(upErr.message, 'storage_upload_failed');

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    throw new ApiError(signErr?.message ?? 'Could not sign upload URL', 'storage_sign_failed');
  }
  return { storagePath: path, signedUrl: signed.signedUrl };
}

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  // Hermes provides global atob; we read file as base64 then byte-decode.
  // Avoids depending on `base64-arraybuffer` while staying React-Native safe.
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError('Not authenticated');
  return user.id;
}

function randomUuid(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
