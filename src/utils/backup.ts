import type { DiaryEntry } from "../types/diary";
import { validDate } from "./date";
export function createBackup(entries: DiaryEntry[]) {
  return JSON.stringify(
    {
      app: "simple-diary",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  );
}
const validTime = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;
export function parseBackup(text: string): DiaryEntry[] {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("备份不是有效的 JSON 文件");
  }
  if (
    !data ||
    data.app !== "simple-diary" ||
    data.schemaVersion !== 1 ||
    !validTime(data.exportedAt) ||
    !Array.isArray(data.entries)
  )
    throw new Error("备份格式或版本不受支持");
  const ids = new Set<string>();
  return data.entries.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("备份包含无效日记");
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== "string" ||
      !e.id.trim() ||
      typeof e.date !== "string" ||
      !validDate(e.date) ||
      typeof e.title !== "string" ||
      typeof e.content !== "string" ||
      !validTime(e.createdAt) ||
      !validTime(e.updatedAt)
    )
      throw new Error("备份包含无效字段、日期或时间");
    if (ids.has(e.id)) throw new Error("备份包含重复 ID");
    ids.add(e.id);
    return {
      id: e.id,
      date: e.date,
      title: e.title,
      content: e.content,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  });
}
