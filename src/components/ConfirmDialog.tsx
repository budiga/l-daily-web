import { useEffect, useRef } from "react";
export function ConfirmDialog({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-ink-200 bg-[#fffafa] p-7 shadow-xl backdrop:bg-ink-900/30"
    >
      <h2 id="delete-title" className="text-lg font-semibold">
        删除这篇日记？
      </h2>
      <p className="my-4 text-sm leading-7 text-ink-500">
        删除后无法撤销。如果想保留内容，请先导出备份。
      </p>
      <div className="flex justify-end gap-3">
        <button
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm"
        >
          取消
        </button>
        <button
          disabled={busy}
          onClick={onConfirm}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white"
        >
          {busy ? "删除中…" : "确认删除"}
        </button>
      </div>
    </dialog>
  );
}
