import { useEffect, useState } from "react";
import { SaveController, type SaveStatus } from "./saveController";
import { saveEntry, deleteEntry } from "../storage/diaryRepository";
import type { DiaryEntry } from "../types/diary";
export function useAutoSave(committed: (entry: DiaryEntry) => void) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [controller] = useState(
    () => new SaveController(saveEntry, deleteEntry, setStatus, committed),
  );
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (controller.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const hide = () => {
      if (document.visibilityState === "hidden")
        void controller.flush().catch(() => {});
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("visibilitychange", hide);
    return () => {
      controller.dispose();
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [controller]);
  return { controller, status };
}
