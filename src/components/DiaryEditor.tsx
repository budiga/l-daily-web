import { useEffect, useRef } from "react";
import type { DiaryEntry } from "../types/diary";
import { displayDate, validDate } from "../utils/date";
interface Props {
  entry: DiaryEntry;
  disabled: boolean;
  dateLocked: boolean;
  onChange: (patch: Partial<DiaryEntry>) => void;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
}
export function DiaryEditor({
  entry,
  disabled,
  dateLocked,
  onChange,
  onBack,
  onDelete,
  onSave,
}: Props) {
  const titleRef = useRef<HTMLInputElement>(null);
  const focusedEntryId = useRef<string | null>(null);

  useEffect(() => {
    if (!disabled && !dateLocked && focusedEntryId.current !== entry.id) {
      titleRef.current?.focus();
      focusedEntryId.current = entry.id;
    }
  }, [entry.id, disabled, dateLocked]);

  return (
    <section aria-label="日记编辑区" className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-6 pt-10 md:px-12 md:pt-14">
        <button
          className="mb-5 self-start text-sm text-ink-600 md:hidden"
          onClick={onBack}
          disabled={disabled}
        >
          ← 返回列表
        </button>
        <div className="mb-7 flex flex-wrap items-center gap-3 text-xs text-ink-500">
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
            className="rounded-md border border-ink-200 bg-transparent px-2 py-1.5"
          />
          <span>{displayDate(entry.date).split("日")[1]}</span>
          {dateLocked && (
            <button
              onClick={onDelete}
              disabled={disabled}
              className="ml-auto rounded-lg px-3 py-2 text-xs text-ink-500 hover:bg-red-50 hover:text-red-700"
            >
              删除日记
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="diary-title">
          标题（选填）
        </label>
        <input
          id="diary-title"
          ref={titleRef}
          readOnly={dateLocked}
          value={entry.title}
          disabled={disabled}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="给今天起个名字"
          className={`w-full shrink-0 bg-transparent px-3 py-3 font-serif text-3xl leading-normal text-ink-800 placeholder:text-ink-300 focus:outline-none md:text-4xl ${dateLocked ? "border-0" : "rounded-lg border border-ink-200"}`}
        />
        <div className="my-7 h-px w-10 shrink-0 bg-[#dba5a5]" />
        <label className="sr-only" htmlFor="diary-content">
          日记正文
        </label>
        <textarea
          id="diary-content"
          readOnly={dateLocked}
          value={entry.content}
          disabled={disabled}
          onChange={(event) => onChange({ content: event.target.value })}
          placeholder="今天，有什么想留下的？"
          className={`min-h-64 w-full flex-1 resize-none bg-transparent px-3 py-3 text-base leading-9 text-ink-700 placeholder:text-ink-400 focus:outline-none ${dateLocked ? "border-0" : "rounded-lg border border-ink-200"}`}
        />
        {!dateLocked && (
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className="mt-6 shrink-0 self-end rounded-lg bg-[#a83f4b] px-6 py-3 text-sm text-white transition-colors hover:bg-[#8e303c]"
          >
            确定创建
          </button>
        )}
        <footer className="flex justify-between gap-4 py-6 text-[11px] text-ink-400">
          <span>只为自己，慢慢写。</span>
          <span>{Array.from(entry.content).length} 字</span>
        </footer>
      </div>
    </section>
  );
}
