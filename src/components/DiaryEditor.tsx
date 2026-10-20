import type { DiaryEntry } from "../types/diary";
import type { SaveStatus } from "../hooks/saveController";
import { displayDate, validDate } from "../utils/date";
interface Props {
  entry: DiaryEntry;
  status: SaveStatus;
  disabled: boolean;
  dateLocked: boolean;
  onChange: (patch: Partial<DiaryEntry>) => void;
  onBack: () => void;
  onDelete: () => void;
  onRetry: () => void;
}
const labels: Record<SaveStatus, string> = {
  idle: "无修改",
  pending: "等待保存…",
  saving: "保存中…",
  saved: "已保存至此浏览器",
  error: "保存失败，内容仍保留",
};
export function DiaryEditor({
  entry,
  status,
  disabled,
  dateLocked,
  onChange,
  onBack,
  onDelete,
  onRetry,
}: Props) {
  return (
    <section aria-label="日记编辑区" className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 px-5 py-4 md:px-10">
        <button
          className="text-sm text-stone-600 md:hidden"
          onClick={onBack}
          disabled={disabled}
        >
          ← 返回列表
        </button>
        <span
          role="status"
          className={`text-xs ${status === "error" ? "text-red-700" : "text-stone-500"}`}
        >
          ● {labels[status]}{" "}
          {status === "error" && (
            <button
              onClick={onRetry}
              disabled={disabled}
              className="ml-2 underline"
            >
              重试
            </button>
          )}
        </span>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="rounded-lg px-3 py-2 text-xs text-stone-500 hover:bg-red-50 hover:text-red-700"
        >
          删除日记
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-6 pt-10 md:px-12 md:pt-14">
        <div className="mb-7 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <label htmlFor="diary-date">日记日期</label>
          <input
            id="diary-date"
            type="date"
            value={entry.date}
            disabled={disabled || dateLocked}
            title={dateLocked ? "已创建的日记不能修改日期" : undefined}
            onChange={(event) => {
              if (validDate(event.target.value))
                onChange({ date: event.target.value });
            }}
            className="rounded-md border border-stone-200 bg-transparent px-2 py-1.5"
          />
          <span>{displayDate(entry.date).split("日")[1]}</span>
        </div>
        <label className="sr-only" htmlFor="diary-title">
          标题（选填）
        </label>
        <input
          id="diary-title"
          value={entry.title}
          disabled={disabled}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="给今天起个名字"
          className="w-full bg-transparent font-serif text-3xl leading-normal text-stone-800 placeholder:text-stone-300 focus:outline-none md:text-4xl"
        />
        <div className="my-7 h-px w-10 shrink-0 bg-[#b6c1ab]" />
        <label className="sr-only" htmlFor="diary-content">
          日记正文
        </label>
        <textarea
          id="diary-content"
          value={entry.content}
          disabled={disabled}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder="今天，有什么想留下的？"
          className="min-h-64 w-full flex-1 resize-none bg-transparent text-base leading-9 text-stone-700 placeholder:text-stone-400 focus:outline-none"
        />
        <footer className="flex justify-between gap-4 py-6 text-[11px] text-stone-400">
          <span>只为自己，慢慢写。</span>
          <span>{Array.from(entry.content).length} 字</span>
        </footer>
      </div>
    </section>
  );
}
