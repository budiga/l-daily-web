import { isBlank, type DiaryEntry } from "../types/diary";
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
export class SaveController {
  private entry: DiaryEntry | null = null;
  private revision = 0;
  private savedRevision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private deleting = false;
  constructor(
    private persist: (e: DiaryEntry) => Promise<void>,
    private remove: (id: string) => Promise<void>,
    private status: (s: SaveStatus) => void,
    private committed: (e: DiaryEntry) => void,
  ) {}
  get dirty() {
    return this.revision !== this.savedRevision;
  }
  select(entry: DiaryEntry | null) {
    this.cancelTimer();
    this.entry = entry;
    this.revision = 0;
    this.savedRevision = 0;
    this.status("idle");
  }
  edit(entry: DiaryEntry) {
    this.entry = entry;
    this.revision++;
    this.status("pending");
    this.cancelTimer();
    this.timer = setTimeout(() => {
      void this.flush().catch(() => {});
    }, 500);
  }
  private cancelTimer() {
    clearTimeout(this.timer);
  }
  flush(): Promise<void> {
    this.cancelTimer();
    const work = this.queue
      .catch(() => {})
      .then(async () => {
        while (this.dirty && this.entry && !this.deleting) {
          const snapshot = { ...this.entry };
          const version = this.revision;
          this.status("saving");
          try {
            if (isBlank(snapshot)) await this.remove(snapshot.id);
            else await this.persist(snapshot);
          } catch (error) {
            this.status("error");
            throw error;
          }
          this.savedRevision = version;
          this.committed(snapshot);
        }
        if (!this.deleting && this.entry)
          this.status(this.dirty ? "pending" : "saved");
      });
    this.queue = work;
    return work;
  }
  async deleteCurrent() {
    this.cancelTimer();
    this.deleting = true;
    try {
      await this.queue.catch(() => {});
      if (this.entry) await this.remove(this.entry.id);
      this.select(null);
    } catch (error) {
      this.status("error");
      throw error;
    } finally {
      this.deleting = false;
    }
  }
  dispose() {
    this.cancelTimer();
  }
}
