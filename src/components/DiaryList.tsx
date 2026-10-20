import { displayDate } from "../utils/date";
import type { DiaryEntry } from "../types/diary";
interface Props {
  entries: DiaryEntry[];
  selected?: string;
  disabled: boolean;
  onSelect: (entry: DiaryEntry) => void;
}
export function DiaryList({ entries, selected, disabled, onSelect }: Props) {
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
      {entries.map((entry) => (
        <button
          type="button"
          key={entry.id}
          disabled={disabled}
          onClick={() => onSelect(entry)}
          aria-current={selected === entry.id ? "page" : undefined}
          className={`mb-2 w-full rounded-xl border p-4 text-left transition-colors ${selected === entry.id ? "border-[#d7dfd2] bg-[#eaf0e5]" : "border-transparent hover:bg-stone-100"}`}
        >
          <p className="mb-2 text-xs text-stone-500">
            {displayDate(entry.date)} · {entry.date.slice(0, 4)}
          </p>
          <h2 className="truncate text-sm font-semibold text-stone-800">
            {entry.title.trim() || entry.date}
          </h2>
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-stone-500">
            {entry.content.replace(/\s*\n\s*/g, " ").slice(0, 80) ||
              "只有标题的一天"}
          </p>
        </button>
      ))}
    </nav>
  );
}
