import { useCallback, useEffect, useState } from "react";
import { DiaryList } from "./components/DiaryList";
import { DiaryEditor } from "./components/DiaryEditor";
import { BackupActions } from "./components/BackupActions";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { PwaControls } from "./components/PwaControls";
import { useManualSave } from "./hooks/useManualSave";
import { importEntries, listEntries } from "./storage/diaryRepository";
import { isBlank, sortEntries, type DiaryEntry } from "./types/diary";
import { createBackup, parseBackup } from "./utils/backup";
import { localDate } from "./utils/date";
import { uuid } from "./utils/uuid";
import { parseTheme } from "./utils/theme";
export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return parseTheme(localStorage.getItem("diary-theme:v1"));
    } catch {
      return parseTheme(null);
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("diary-theme:v1", theme);
    } catch {
      // 存储不可用时仍允许在当前页面切换主题。
    }
  }, [theme]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreatedToast, setShowCreatedToast] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const committed = useCallback((saved: DiaryEntry) => {
    setEntries((previous) =>
      sortEntries([
        ...previous.filter((e) => e.id !== saved.id),
        ...(isBlank(saved) ? [] : [saved]),
      ]),
    );
  }, []);
  const { controller } = useManualSave(committed);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setEntries(await listEntries());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!showCreatedToast) return;
    const timer = setTimeout(() => setShowCreatedToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showCreatedToast]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "操作失败，请重试；当前输入仍保留。",
      );
    } finally {
      setBusy(false);
    }
  }
  function select(next: DiaryEntry | null) {
    void action(async () => {
      if (
        controller.dirty &&
        !window.confirm("当前日记尚未保存，确定放弃修改吗？")
      )
        return;
      controller.select(next);
      setEntry(next);
    });
  }
  function create() {
    const now = new Date().toISOString();
    select({
      id: uuid(),
      date: localDate(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    });
  }
  function change(patch: Partial<DiaryEntry>) {
    if (!entry || busy) return;
    if (entries.some((saved) => saved.id === entry.id)) return;
    const next = {
      ...entry,
      ...patch,
      date: patch.date ?? entry.date,
      updatedAt: new Date().toISOString(),
    };
    setEntry(next);
    controller.edit(next);
  }
  function save() {
    if (entry && entries.some((saved) => saved.id === entry.id)) return;
    if (!entry || isBlank(entry)) {
      setMessage("请先填写标题或正文。");
      return;
    }
    void action(async () => {
      await controller.flush();
      controller.select(null);
      setEntry(null);
      setShowCreatedToast(true);
    });
  }
  function exportBackup() {
    void action(async () => {
      const all = await listEntries();
      if (!all.length) {
        setMessage("暂无可导出内容。");
        return;
      }
      const url = URL.createObjectURL(
        new Blob([createBackup(all)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `diary-backup-${localDate()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("备份已导出，请妥善保管。");
    });
  }
  function importBackup(file: File) {
    void action(async () => {
      const imported = parseBackup(await file.text());
      const result = await importEntries(imported);
      setEntries(await listEntries());
      setMessage(
        `导入完成：新增 ${result.added} 篇，重复跳过 ${result.duplicate} 篇，冲突跳过 ${result.conflict} 篇。冲突项保留了本地版本。`,
      );
    });
  }
  function remove() {
    void action(async () => {
      const id = entry?.id;
      try {
        await controller.deleteCurrent();
        setEntries((previous) => previous.filter((e) => e.id !== id));
        setEntry(null);
        setConfirm(false);
      } catch (error) {
        setConfirm(false);
        throw error;
      }
    });
  }
  return (
    <div className="app-shell min-h-dvh bg-[var(--diary-page)] p-0 text-[var(--diary-text)] md:p-7 lg:p-10">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-end px-4 md:px-0">
        <PwaControls
          canReload={() => !controller.dirty && !busy && !loading}
          blocked={controller.dirty || busy || loading}
        />
        <label
          htmlFor="theme-select"
          className="mr-3 text-xs text-[var(--diary-secondary)]"
        >
          主题
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(event) => setTheme(parseTheme(event.target.value))}
          className="rounded-lg border border-[var(--diary-border)] bg-[var(--diary-paper)] px-3 py-2 text-sm text-[var(--diary-secondary)]"
        >
          <option value="original">原色</option>
          <option value="green">绿色</option>
          <option value="red">红色</option>
        </select>
      </div>
      <div className="diary-frame mx-auto flex h-[calc(100dvh-3rem)] max-w-7xl overflow-hidden bg-[var(--diary-paper)] md:h-[calc(100dvh-6.5rem)] md:min-h-[560px] md:rounded-2xl md:border md:border-[var(--diary-border)] lg:h-[calc(100dvh-8rem)]">
        <aside
          className={`${entry ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-[var(--diary-border)]/80 bg-[var(--diary-sidebar)] md:w-80`}
        >
          <header className="px-7 pb-6 pt-8">
            <div className="mb-8 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--diary-logo)] font-serif text-xl text-[var(--diary-logo-text)]"
                aria-hidden="true"
              >
                日
              </span>
              <div>
                <p className="mt-1 text-[10px] tracking-[0.18em] text-[var(--diary-subtle)]">
                  留一点时间给自己
                </p>
              </div>
            </div>
            <button
              disabled={busy || loading || loadError}
              onClick={create}
              className="w-full rounded-lg bg-[var(--diary-primary)] px-4 py-3 text-sm text-white transition-colors hover:bg-[var(--diary-primary-hover)]"
            >
              ＋ 写日记
            </button>
          </header>
          {loading ? (
            <p
              role="status"
              className="flex-1 px-7 text-sm text-[var(--diary-muted)]"
            >
              正在打开日记本…
            </p>
          ) : loadError ? (
            <div role="alert" className="flex-1 px-7 text-sm text-red-700">
              无法读取本地数据库。
              <button onClick={() => void load()} className="ml-2 underline">
                重试
              </button>
            </div>
          ) : (
            <DiaryList
              entries={entries}
              selected={entry?.id}
              disabled={busy}
              onSelect={select}
            />
          )}
          <BackupActions
            disabled={busy || loading || loadError}
            onExport={exportBackup}
            onImport={importBackup}
          />
        </aside>
        <main
          className={`${entry ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}
        >
          {message && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 border-b border-[var(--diary-border)] bg-[var(--diary-notice)] px-5 py-3 text-sm leading-6"
            >
              <span>{message}</span>
              <button aria-label="关闭提示" onClick={() => setMessage("")}>
                ×
              </button>
            </div>
          )}
          {entry ? (
            <DiaryEditor
              entry={entry}
              dateLocked={entries.some((saved) => saved.id === entry.id)}
              onSave={save}
              disabled={busy}
              onChange={change}
              onBack={() => select(null)}
              onDelete={() => setConfirm(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span
                className="mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--diary-accent-border)] bg-[var(--diary-soft)] font-serif text-3xl text-[var(--diary-icon)]"
                aria-hidden="true"
              >
                ✎
              </span>
              <p className="mt-5 text-sm leading-8 text-[var(--diary-muted)]">
                这里，是只属于你的安静角落。
              </p>
              <button
                onClick={create}
                disabled={busy || loading || loadError}
                className="mt-8 rounded-lg border border-[var(--diary-selected-border)] px-5 py-2.5 text-sm text-[var(--diary-primary)] hover:bg-[var(--diary-soft)]"
              >
                {entries.length > 0 ? "写一篇新日记 ↗" : "写下你的第一篇日记 ↗"}
              </button>
              <p className="mt-16 text-[11px] text-[var(--diary-subtle)]">
                本地保存 · 无需登录 · 自由书写
              </p>
            </div>
          )}
        </main>
      </div>
      {showCreatedToast && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--diary-accent-border)] bg-[var(--diary-notice)] px-5 py-3 text-sm text-[var(--diary-primary)] shadow-md"
        >
          日记创建成功
        </div>
      )}
      {!entry && message && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-5 rounded-lg border border-[var(--diary-border)] bg-white p-4 text-sm shadow-md md:hidden"
        >
          {message}
          <button
            aria-label="关闭提示"
            onClick={() => setMessage("")}
            className="float-right"
          >
            ×
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={remove}
      />
    </div>
  );
}
