import {
  applyPlayerOperation,
  createPlayerState,
  InvalidPlayerStateError,
  type PlayerOperation,
  type PlayerState,
  progressDocument,
} from "../domain/playerState";
import type { Locale } from "../i18n";
import type { ProgressStore } from "../infra/progressStore";

export class PlayerController {
  private confirmed: PlayerState;
  private pending: PlayerOperation[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private initialized = false;
  snapshot: {
    state: PlayerState;
    status: "loading" | "ready" | "unavailable" | "corrupt" | "future";
    initialized: boolean;
  };
  constructor(
    private store: ProgressStore,
    private locale: Locale,
  ) {
    this.confirmed = createPlayerState(locale);
    this.snapshot = {
      state: this.confirmed,
      status: "loading",
      initialized: false,
    };
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(status = this.snapshot.status) {
    this.snapshot = {
      state: this.pending.reduce(applyPlayerOperation, this.confirmed),
      status,
      initialized: this.initialized,
    };
    for (const listener of this.listeners) listener();
  }
  private accept(state: PlayerState) {
    if (
      this.initialized &&
      state.storageId === this.confirmed.storageId &&
      state.revision < this.confirmed.revision
    )
      return;
    if (!this.initialized)
      // Before the first read, operations belong to this page's temporary session.
      // Bind them once to the loaded epoch; later epoch changes must discard them.
      this.pending = this.pending.map((operation) =>
        operation.kind === "locale"
          ? operation
          : { ...operation, epoch: state.epoch },
      );
    else if (state.epoch !== this.confirmed.epoch)
      this.pending = this.pending.filter(
        (operation) => operation.kind === "locale",
      );
    this.confirmed = state;
    this.initialized = true;
  }
  refresh = (): Promise<boolean> => {
    const task = this.queue.then(async () => {
      try {
        this.accept(await this.store.read(this.locale));
        this.publish(this.pending.length ? "unavailable" : "ready");
        return true;
      } catch (error) {
        this.publish(
          error instanceof InvalidPlayerStateError
            ? error.status
            : "unavailable",
        );
        return false;
      }
    });
    this.queue = task;
    return task;
  };
  dispatch(operation: PlayerOperation): Promise<boolean> {
    if (
      !this.initialized &&
      this.snapshot.status === "loading" &&
      operation.kind !== "locale"
    )
      return Promise.resolve(false);
    if (operation.kind !== "locale" && operation.epoch !== this.confirmed.epoch)
      return Promise.resolve(false);
    this.pending.push(operation);
    this.publish();
    if (!this.initialized) return Promise.resolve(false);
    return this.flush();
  }
  flush = (): Promise<boolean> => {
    const task = this.queue.then(async () => {
      if (!this.initialized) return false;
      const batch = [...this.pending];
      if (!batch.length) return this.snapshot.status === "ready";
      try {
        const state = await this.store.commit(this.locale, batch);
        this.pending = this.pending.filter(
          (operation) => !batch.includes(operation),
        );
        this.accept(state);
        this.publish(this.pending.length ? this.snapshot.status : "ready");
        this.notify?.();
        return batch.every((operation) =>
          operation.kind === "locale" || operation.kind === "reset"
            ? operation.kind !== "reset" || state.epoch === operation.nextEpoch
            : operation.epoch === state.epoch,
        );
      } catch (error) {
        this.publish(
          error instanceof InvalidPlayerStateError
            ? error.status
            : "unavailable",
        );
        return false;
      }
    });
    this.queue = task;
    return task;
  };
  retry = async () => {
    if (!(await this.refresh())) return false;
    return this.flush();
  };
  async reset(): Promise<boolean> {
    // A reset is explicit and is never queued for an automatic retry after failure.
    const epoch = this.confirmed.epoch;
    const nextEpoch = crypto.randomUUID();
    const task = this.queue.then(async () => {
      try {
        const state = await this.store.commit(this.locale, [
          { kind: "reset", epoch, nextEpoch },
        ]);
        if (state.epoch === nextEpoch)
          this.pending = this.pending.filter(
            (operation) => operation.kind === "locale",
          );
        this.accept(state);
        this.publish(this.pending.length ? "unavailable" : "ready");
        this.notify?.();
        return state.epoch === nextEpoch;
      } catch (error) {
        this.publish(
          error instanceof InvalidPlayerStateError
            ? error.status
            : "unavailable",
        );
        return false;
      }
    });
    this.queue = task;
    return task;
  }
  notify?: () => void;
  get document() {
    return progressDocument(this.snapshot.state);
  }
}
