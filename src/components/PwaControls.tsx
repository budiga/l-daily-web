import { useEffect, useRef, useState } from "react";
import { usePwa } from "../hooks/usePwa";
import { installInstructions } from "../pwa/install";

export function PwaControls({
  canReload,
  blocked,
}: {
  canReload: () => boolean;
  blocked: boolean;
}) {
  const pwa = usePwa(canReload);
  const [help, setHelp] = useState(false);
  const [later, setLater] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!help) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, [help]);

  const error = pwa.installError || pwa.error;
  return (
    <>
      {!pwa.installed && (
        <button
          type="button"
          disabled={pwa.installing}
          onClick={() =>
            pwa.canPromptInstall ? void pwa.install() : setHelp(true)
          }
          className="mr-auto rounded-lg border border-[var(--diary-border)] px-3 py-2 text-xs text-[var(--diary-secondary)]"
        >
          {pwa.installing ? "正在安装…" : "安装应用"}
        </button>
      )}
      {pwa.needRefresh && later && (
        <button
          type="button"
          onClick={() => setLater(false)}
          className="mr-3 rounded-lg border border-[var(--diary-border)] px-3 py-2 text-xs text-[var(--diary-secondary)]"
        >
          更新可用
        </button>
      )}
      {(error || (pwa.needRefresh && !later) || pwa.offlineReady) && (
        <div className="pwa-notice fixed inset-x-4 z-40 mx-auto max-w-lg rounded-xl border border-[var(--diary-accent-border)] bg-[var(--diary-paper)] p-4 text-sm shadow-lg">
          {error ? (
            <div
              role="alert"
              className="flex items-start justify-between gap-3"
            >
              <p>{error}</p>
              <button
                type="button"
                aria-label="关闭 PWA 提示"
                onClick={pwa.clearError}
              >
                ×
              </button>
            </div>
          ) : pwa.needRefresh && !later ? (
            <>
              <p role="status">发现新版本，更新后将刷新页面。</p>
              {blocked && (
                <p className="mt-2 text-xs text-[var(--diary-muted)]">
                  请先保存当前日记，并等待正在进行的操作完成。
                </p>
              )}
              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={pwa.updating}
                  onClick={() => setLater(true)}
                  className="rounded-lg border border-[var(--diary-border)] px-3 py-2"
                >
                  稍后
                </button>
                <button
                  type="button"
                  disabled={blocked || pwa.updating}
                  onClick={pwa.update}
                  className="rounded-lg bg-[var(--diary-primary)] px-3 py-2 text-white"
                >
                  {pwa.updating ? "更新中…" : "更新"}
                </button>
              </div>
            </>
          ) : (
            <div
              role="status"
              className="flex items-start justify-between gap-3"
            >
              <p>已可离线使用。日记仍只保存在当前设备，请定期导出备份。</p>
              <button
                type="button"
                aria-label="关闭离线提示"
                onClick={pwa.dismissOfflineReady}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="install-title"
        onCancel={() => setHelp(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--diary-border)] bg-[var(--diary-paper)] p-7 text-[var(--diary-text)] shadow-xl backdrop:bg-stone-900/30"
      >
        <h2 id="install-title" className="text-lg font-semibold">
          安装我的记事本
        </h2>
        <p className="my-4 text-sm leading-7 text-[var(--diary-muted)]">
          {installInstructions(navigator.userAgent, navigator.maxTouchPoints)}
        </p>
        <p className="mb-4 text-xs leading-6 text-[var(--diary-muted)]">
          首次联网打开并完成离线准备后，即可断网使用。安装不会同步其他设备或旧地址中的日记。
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => setHelp(false)}
          className="float-right rounded-lg bg-[var(--diary-primary)] px-4 py-2 text-sm text-white"
        >
          知道了
        </button>
      </dialog>
    </>
  );
}
