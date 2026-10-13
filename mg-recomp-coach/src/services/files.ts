// Backup export/import and local photo storage. Nothing is uploaded anywhere.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { migrate } from '../engine/defaults';
import type { AppData } from '../engine/types';

export async function exportBackup(data: AppData, label = 'backup'): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `mg-recomp-${label}-${date}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify({ app: 'mg-recomp-coach', exportedAt: new Date().toISOString(), data }, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your MG Recomp backup' });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

/** Returns migrated data from a picked JSON backup, or null if cancelled. Throws on invalid files. */
export async function pickBackup(): Promise<AppData | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  const parsed = JSON.parse(text);
  const raw = parsed?.data ?? parsed;
  if (!raw || typeof raw !== 'object' || !raw.profile || !raw.plan) throw new Error('This file is not an MG Recomp Coach backup.');
  return migrate(raw);
}

/** Copy a picked/captured photo into the app's private documents folder. */
export function savePhotoLocally(uri: string): string {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const src = new File(uri);
  const name = `photo-${Date.now()}.${(src.extension || '.jpg').replace('.', '')}`;
  const dest = new File(dir, name);
  src.copy(dest);
  return dest.uri;
}

export function deleteLocalFile(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}
