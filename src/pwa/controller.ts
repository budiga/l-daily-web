export interface PwaState {
  offlineReady: boolean;
  needRefresh: boolean;
  updating: boolean;
  error: string;
}

export const initialPwaState: PwaState = {
  offlineReady: false,
  needRefresh: false,
  updating: false,
  error: "",
};

// Only this page's explicit approval may reload it. A different tab can activate
// the waiting worker, but must never discard this page's unsaved input.
export class PwaController {
  private state = { ...initialPwaState };
  private registration?: ServiceWorkerRegistration;
  private currentController: ServiceWorker | null;
  private reloadPending = false;
  private approved = false;
  private disposed = false;
  private checking = false;
  private lastCheck = 0;
  private timeout?: ReturnType<typeof setTimeout>;
  private cleanup: (() => void)[] = [];

  constructor(
    private container: ServiceWorkerContainer,
    private canReload: () => boolean,
    private changed: (state: PwaState) => void,
    private reload: () => void,
  ) {
    this.currentController = container.controller;
  }

  private set(patch: Partial<PwaState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.changed(this.state);
  }

  private listen(target: EventTarget, event: string, callback: () => void) {
    target.addEventListener(event, callback);
    this.cleanup.push(() => target.removeEventListener(event, callback));
  }

  async start() {
    this.listen(this.container, "controllerchange", () => {
      const next = this.container.controller;
      if (!next || next === this.currentController) return;
      const firstInstall = !this.currentController;
      this.currentController = next;
      if (firstInstall && !this.state.needRefresh) {
        this.set({ offlineReady: true });
        return;
      }
      this.reloadPending = true;
      clearTimeout(this.timeout);
      this.set({ needRefresh: true, updating: false });
      if (this.approved && this.canReload()) {
        this.approved = false;
        this.reload();
      } else {
        this.approved = false;
      }
    });
    try {
      const registration = await this.container.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      if (this.disposed) return;
      this.registration = registration;
      const watch = () => {
        const worker = registration.installing;
        if (!worker) return;
        const inspect = () => {
          if (worker.state === "installed" && this.container.controller) {
            this.set({ needRefresh: true, error: "" });
          } else if (worker.state === "activated" && !this.state.needRefresh) {
            this.set({ offlineReady: true, error: "" });
          } else if (worker.state === "redundant") {
            this.set({ error: "离线资源准备失败，联网后请刷新重试。" });
          }
        };
        this.listen(worker, "statechange", inspect);
        inspect();
      };
      this.listen(registration, "updatefound", watch);
      watch();
      if (registration.waiting) this.set({ needRefresh: true });
    } catch {
      this.set({
        error: "离线功能暂不可用，联网后请刷新重试。日记本仍可正常使用。",
      });
    }
  }

  async checkForUpdate() {
    if (
      this.disposed ||
      !this.registration ||
      this.checking ||
      this.registration.installing ||
      Date.now() - this.lastCheck < 60_000
    )
      return;
    this.checking = true;
    this.lastCheck = Date.now();
    try {
      await this.registration.update();
    } catch {
      // Offline or a transient server failure: keep the current version usable.
    } finally {
      this.checking = false;
    }
  }

  update() {
    if (this.disposed || this.state.updating) return;
    if (!this.canReload()) {
      this.set({
        error: "请先保存当前日记，并等待正在进行的操作完成后再更新。",
      });
      return;
    }
    if (this.reloadPending) {
      this.reload();
      return;
    }
    const waiting = this.registration?.waiting;
    if (!waiting) {
      this.set({ error: "新版尚未准备好，请联网后刷新检查；当前输入仍保留。" });
      return;
    }
    this.approved = true;
    this.set({ updating: true, error: "" });
    this.timeout = setTimeout(() => {
      this.approved = false;
      this.set({
        updating: false,
        error: "更新暂未完成，请稍后重试。当前输入仍保留。",
      });
    }, 15_000);
    try {
      waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      clearTimeout(this.timeout);
      this.approved = false;
      this.set({
        updating: false,
        error: "更新失败，请稍后重试。当前输入仍保留。",
      });
    }
  }

  dismissOfflineReady() {
    this.set({ offlineReady: false });
  }

  clearError() {
    this.set({ error: "" });
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timeout);
    this.cleanup.forEach((remove) => remove());
  }
}
