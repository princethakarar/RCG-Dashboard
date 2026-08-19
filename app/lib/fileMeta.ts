import { supabase } from './supabase';

// Per-user record of the last uploaded file name for a given dataset, so the
// dashboard can show the actual file the user uploaded instead of a hardcoded
// label. Keyed by (user_id, file_key) in the `user_file_meta` table.

/** Save (upsert) the uploaded file name for a user + dataset. Never throws. */
export async function saveFileName(
  userId: string,
  fileKey: string,
  fileName: string | null | undefined
): Promise<void> {
  try {
    if (!fileName) return;
    await supabase.from('user_file_meta').upsert(
      { user_id: userId, file_key: fileKey, file_name: fileName, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,file_key' }
    );
  } catch (err) {
    console.error(`[fileMeta] save failed for ${fileKey} (non-critical):`, err);
  }
}

/** Get the stored file name for a user + dataset, or null. Never throws. */
export async function getFileName(userId: string, fileKey: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_file_meta')
      .select('file_name')
      .eq('user_id', userId)
      .eq('file_key', fileKey)
      .maybeSingle();
    if (error) return null;
    return (data as { file_name?: string } | null)?.file_name ?? null;
  } catch {
    return null;
  }
}
