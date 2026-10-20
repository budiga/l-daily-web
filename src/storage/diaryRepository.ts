import {
  equalEntries,
  sortEntries,
  type DiaryEntry,
  type ImportResult,
} from "../types/diary";
let connection: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("simple-diary", 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("entries", {
          keyPath: "id",
        });
        store.createIndex("date", "date");
      };
      request.onerror = () =>
        reject(request.error ?? new Error("无法打开数据库"));
      request.onblocked = () =>
        reject(new Error("数据库升级被其他页面阻止，请关闭其他标签页后重试"));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
function completed(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("数据库事务失败"));
    tx.onerror = () => reject(tx.error ?? new Error("数据库写入失败"));
  });
}
export async function listEntries() {
  const db = await openDatabase();
  const tx = db.transaction("entries", "readonly");
  const done = completed(tx);
  const request = tx.objectStore("entries").getAll();
  await done;
  return sortEntries(request.result as DiaryEntry[]);
}
export async function saveEntry(entry: DiaryEntry) {
  const db = await openDatabase();
  const tx = db.transaction("entries", "readwrite");
  const done = completed(tx);
  tx.objectStore("entries").put(entry);
  await done;
}
export async function deleteEntry(id: string) {
  const db = await openDatabase();
  const tx = db.transaction("entries", "readwrite");
  const done = completed(tx);
  tx.objectStore("entries").delete(id);
  await done;
}
export async function importEntries(
  entries: DiaryEntry[],
): Promise<ImportResult> {
  const db = await openDatabase();
  const tx = db.transaction("entries", "readwrite");
  const done = completed(tx);
  const store = tx.objectStore("entries");
  const result = { added: 0, duplicate: 0, conflict: 0 };
  try {
    for (const entry of entries) {
      const request = store.get(entry.id);
      request.onsuccess = () => {
        const existing = request.result as DiaryEntry | undefined;
        if (!existing) {
          store.add(entry);
          result.added++;
        } else if (equalEntries(existing, entry)) result.duplicate++;
        else result.conflict++;
      };
    }
  } catch (error) {
    tx.abort();
    await done.catch(() => {});
    throw error;
  }
  await done;
  return result;
}
