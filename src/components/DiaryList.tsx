import { useState } from "react";
import { displayDate } from "../utils/date";
import type { DiaryEntry } from "../types/diary";
interface Props {
  entries: DiaryEntry[];
  selected?: string;
  disabled: boolean;
  onSelect: (entry: DiaryEntry) => void;
}
export function DiaryList({ entries, selected, disabled, onSelect }: Props) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const groups = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.date) ?? [];
    group.push(entry);
    groups.set(entry.date, group);
  }

  function toggleDate(date: string) {
    setExpandedDates((previous) => {
      const next = new Set(previous);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <nav
      aria-label="历史日记"
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
    >
      <div className="mb-4 flex items-center justify-between px-3 text-xs tracking-widest text-stone-400">
        <span>所有日记</span>
        <span>{entries.length} 篇</span>
      </div>
      {!entries.length && (
        <p className="px-3 py-8 text-sm leading-7 text-stone-500">
          写下你的第一篇日记。
          <br />
          一点小事，也值得记录。
        </p>
      )}
      {Array.from(groups, ([date, dateEntries]) => (
        <section key={date} className="mb-2">
          <button
            type="button"
            aria-expanded={expandedDates.has(date)}
            aria-controls={`diary-date-${date}`}
            onClick={() => toggleDate(date)}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-xs text-stone-500 transition-colors hover:bg-stone-100"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-xl leading-none"
            >
              {expandedDates.has(date) ? "▾" : "▸"}
            </span>
            <span className="flex-1">{displayDate(date)} · {date.slice(0, 4)}</span>
            <span className="shrink-0 text-stone-400">{dateEntries.length} 篇</span>
          </button>
          <div id={`diary-date-${date}`} hidden={!expandedDates.has(date)}>
            {dateEntries.map((entry) => (
              <button
                type="button"
                key={entry.id}
                disabled={disabled}
                onClick={() => onSelect(entry)}
                aria-current={selected === entry.id ? "page" : undefined}
                className={`mb-2 w-full rounded-xl border p-4 text-left transition-colors ${selected === entry.id ? "border-[#d7dfd2] bg-[#eaf0e5]" : "border-transparent hover:bg-stone-100"}`}
              >
                <h2 className="truncate text-sm font-semibold text-stone-800">
                  {entry.title.trim() || entry.date}
                </h2>
                <p className="mt-2 truncate text-xs leading-6 text-stone-500">
                  {entry.content.replace(/\s*\n\s*/g, " ").slice(0, 80) ||
                    "只有标题的一天"}
                </p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}
