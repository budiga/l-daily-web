import { useRef } from "react";
export function BackupActions({
  disabled,
  onExport,
  onImport,
}: {
  disabled: boolean;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="border-t border-ink-200 p-6">
      <div className="mb-3 flex gap-3">
        <button
          disabled={disabled}
          onClick={onExport}
          className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600 hover:bg-ink-100"
        >
          ↓ 导出备份
        </button>
        <button
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600 hover:bg-ink-100"
        >
          ↑ 导入备份
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="选择日记备份"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onImport(file);
          }}
        />
      </div>
      <p className="text-[11px] leading-5 text-ink-400">
        内容仅保存在当前浏览器。清理浏览器数据会丢失日记，请定期导出备份。
      </p>
    </div>
  );
}
