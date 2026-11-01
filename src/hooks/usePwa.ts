import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { initialPwaState, PwaController } from "../pwa/controller";
import { isStandalone, type InstallPromptEvent } from "../pwa/install";

function standalone() {
  return isStandalone(
    window.matchMedia("(display-mode: standalone)").matches,
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
}

export function usePwa(canReload: () => boolean) {
  const [state, setState] = useState(initialPwaState);
  const [installed, setInstalled] = useState(standalone);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const manager = useRef<PwaController | null>(null);
  const reloadGuard = useRef(canReload);
  useLayoutEffect(() => {
    reloadGuard.current = canReload;
  }, [canReload]);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(standalone());
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener("change", onDisplayMode);

    const controller =
      import.meta.env.PROD &&
      window.isSecureContext &&
      "serviceWorker" in navigator
        ? new PwaController(
            navigator.serviceWorker,
            () => reloadGuard.current(),
            setState,
            () => window.location.reload(),
          )
        : null;
    manager.current = controller;
    if (controller) void controller.start();
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void controller?.checkForUpdate();
      }
    };
    window.addEventListener("online", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      controller?.dispose();
      manager.current = null;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener("change", onDisplayMode);
      window.removeEventListener("online", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallError("");
    try {
      // Must stay in the click handler: installation requires a user gesture.
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      setInstallError("未能打开安装窗口，请通过浏览器菜单安装，或稍后重试。");
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  return {
    ...state,
    installed,
    installing,
    installError,
    canPromptInstall: installPrompt !== null,
    install,
    update: () => manager.current?.update(),
    dismissOfflineReady: () => manager.current?.dismissOfflineReady(),
    clearError: () => {
      manager.current?.clearError();
      setInstallError("");
    },
  };
}
