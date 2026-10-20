import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { SaveController } from "../src/hooks/saveController";
import { createBackup, parseBackup } from "../src/utils/backup";
import {
  deleteEntry,
  importEntries,
  listEntries,
  saveEntry,
} from "../src/storage/diaryRepository";
import type { DiaryEntry } from "../src/types/diary";
const entry = (id = "one"): DiaryEntry => ({
  id,
  date: "2026-10-19",
  title: "今天",
  content: "一段日记\n下一行",
  createdAt: "2026-10-19T01:00:00.000Z",
  updatedAt: "2026-10-19T01:00:00.000Z",
});
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
describe("手动保存", () => {
  it("保存中继续输入时按顺序写入，并在最新事务结束后显示成功", async () => {
    const first = deferred();
    const second = deferred();
    const started = deferred();
    const status = vi.fn();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => {
        started.resolve();
        return first.promise;
      })
      .mockReturnValueOnce(second.promise);
    const c = new SaveController(persist, vi.fn(), status, vi.fn());
    c.select(entry());
    c.edit({ ...entry(), content: "旧内容" });
    const flush = c.flush();
    await started.promise;
    c.edit({ ...entry(), content: "新内容" });
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(status).not.toHaveBeenLastCalledWith("saved");
    second.resolve();
    await flush;
    expect(persist.mock.calls.map((call) => call[0].content)).toEqual([
      "旧内容",
      "新内容",
    ]);
    expect(status).toHaveBeenLastCalledWith("saved");
    c.dispose();
  });
  it("删除等待已开始的写入，取消待保存内容，之后不会恢复记录", async () => {
    const writing = deferred();
    const started = deferred();
    const events: string[] = [];
    const c = new SaveController(
      async () => {
        events.push("save");
        started.resolve();
        await writing.promise;
      },
      async () => {
        events.push("delete");
      },
      vi.fn(),
      vi.fn(),
    );
    c.select(entry());
    c.edit(entry());
    const flush = c.flush();
    await started.promise;
    c.edit({ ...entry(), content: "未保存修改" });
    const deleting = c.deleteCurrent();
    writing.resolve();
    await flush;
    await deleting;
    expect(events).toEqual(["save", "delete"]);
    expect(c.dirty).toBe(false);
    await c.flush();
    expect(events).toEqual(["save", "delete"]);
    c.dispose();
  });
  it("失败保留脏数据，重试后才能显示已保存", async () => {
    const persist = vi
      .fn()
      .mockRejectedValueOnce(new Error("磁盘已满"))
      .mockResolvedValueOnce(undefined);
    const status = vi.fn();
    const c = new SaveController(persist, vi.fn(), status, vi.fn());
    c.select(entry());
    c.edit(entry());
    await expect(c.flush()).rejects.toThrow("磁盘已满");
    expect(c.dirty).toBe(true);
    expect(status).toHaveBeenLastCalledWith("error");
    await c.flush();
    expect(c.dirty).toBe(false);
    c.dispose();
  });
  it("空白内容删除存储记录，重新输入复用 ID", async () => {
    const persist = vi.fn();
    const remove = vi.fn();
    const c = new SaveController(persist, remove, vi.fn(), vi.fn());
    c.select(entry());
    c.edit({ ...entry(), title: " ", content: "\n" });
    await c.flush();
    expect(remove).toHaveBeenCalledWith("one");
    c.edit(entry());
    await c.flush();
    expect(persist).toHaveBeenCalledWith(entry());
    c.dispose();
  });
  it("停止输入后不会保存，显式确认后才保存", async () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const c = new SaveController(persist, vi.fn(), vi.fn(), vi.fn());
    c.select(entry());
    c.edit(entry());
    await vi.advanceTimersByTimeAsync(499);
    expect(persist).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(persist).not.toHaveBeenCalled();
    await c.flush();
    expect(persist).toHaveBeenCalledOnce();
    c.dispose();
    vi.useRealTimers();
  });
});
describe("备份校验", () => {
  it("完整往返保留换行和全部字段", () =>
    expect(parseBackup(createBackup([entry()]))).toEqual([entry()]));
  it.each([
    "不是 JSON",
    createBackup([entry(), entry()]),
    createBackup([{ ...entry(), date: "2026-02-30" }]),
    createBackup([{ ...entry(), createdAt: "2026-02-30T00:00:00.000Z" }]),
    JSON.stringify({ app: "other", schemaVersion: 1, entries: [] }),
  ])("拒绝损坏、重复 ID 或无效日期的文件", (text) =>
    expect(() => parseBackup(text)).toThrow(),
  );
});
describe("IndexedDB", () => {
  beforeEach(async () => {
    for (const e of await listEntries()) await deleteEntry(e.id);
  });
  it("按日期及同日创建时间降序返回", async () => {
    await saveEntry(entry());
    await saveEntry({ ...entry("two"), createdAt: "2026-10-19T02:00:00.000Z" });
    await saveEntry({ ...entry("three"), date: "2026-10-18" });
    expect((await listEntries()).map((e) => e.id)).toEqual([
      "two",
      "one",
      "three",
    ]);
  });
  it("导入区分新增、重复与冲突，并保留本地版本", async () => {
    await saveEntry(entry());
    const result = await importEntries([entry(), entry("two")]);
    expect(result).toEqual({ added: 1, duplicate: 1, conflict: 0 });
    expect(await importEntries([{ ...entry(), content: "远端内容" }])).toEqual({
      added: 0,
      duplicate: 0,
      conflict: 1,
    });
    expect((await listEntries()).find((e) => e.id === "one")?.content).toBe(
      entry().content,
    );
  });
  it("任意写入失败时整个导入事务回滚", async () => {
    await expect(
      importEntries([
        entry(),
        { ...entry("broken"), id: undefined } as unknown as DiaryEntry,
      ]),
    ).rejects.toThrow();
    expect(await listEntries()).toEqual([]);
  });
});
