import { useEffect, useState } from "react";
import { SaveController, type SaveStatus } from "./saveController";
import { saveEntry, deleteEntry } from "../storage/diaryRepository";
import type { DiaryEntry } from "../types/diary";
export function useManualSave(committed: (entry: DiaryEntry) => void) {
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
    window.addEventListener("beforeunload", leave);
    return () => {
      controller.dispose();
      window.removeEventListener("beforeunload", leave);
    };
  }, [controller]);
  return { controller, status };
}
