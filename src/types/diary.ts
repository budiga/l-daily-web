export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
export interface ImportResult {
  added: number;
  duplicate: number;
  conflict: number;
}
export const isBlank = (entry: DiaryEntry) =>
  !entry.title.trim() && !entry.content.trim();
export const sortEntries = (entries: DiaryEntry[]) =>
  entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id),
  );
export const equalEntries = (a: DiaryEntry, b: DiaryEntry) =>
  (["id", "date", "title", "content", "createdAt", "updatedAt"] as const).every(
    (k) => a[k] === b[k],
  );
