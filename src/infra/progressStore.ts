import {
  applyPlayerOperation,
  createPlayerState,
  InvalidPlayerStateError,
  isPlayerState,
  type PlayerOperation,
  type PlayerState,
} from "../domain/playerState";
import type { Locale } from "../i18n";

export interface ProgressStore {
  read(locale: Locale): Promise<PlayerState>;
  commit(
    locale: Locale,
    operations: readonly PlayerOperation[],
  ): Promise<PlayerState>;
}
export class IndexedDbProgressStore implements ProgressStore {
  private databasePromise?: Promise<IDBDatabase>;
  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-player-v2", 1);
      let abandoned = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore("state");
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        abandoned = true;
        reject(new Error("IndexedDB blocked"));
      };
      request.onsuccess = () => {
        const database = request.result;
        if (abandoned) {
          database.close();
          return;
        }
        const invalidate = () => {
          if (this.databasePromise === promise)
            this.databasePromise = undefined;
        };
        database.onversionchange = () => {
          database.close();
          invalidate();
        };
        database.onclose = invalidate;
        resolve(database);
      };
    });
    this.databasePromise = promise;
    void promise.catch(() => {
      if (this.databasePromise === promise) this.databasePromise = undefined;
    });
    return promise;
  }
  read(locale: Locale) {
    return this.commit(locale, []);
  }
  async commit(
    locale: Locale,
    operations: readonly PlayerOperation[],
  ): Promise<PlayerState> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction("state", "readwrite");
      } catch (error) {
        this.databasePromise = undefined;
        database.close();
        reject(error);
        return;
      }
      let result: PlayerState;
      let failure: unknown;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () =>
        reject(
          failure ?? transaction.error ?? new Error("Transaction aborted"),
        );
      const store = transaction.objectStore("state");
      const request = store.get("current");
      request.onsuccess = () => {
        try {
          const reset =
            operations.length === 1 && operations[0]?.kind === "reset"
              ? operations[0]
              : undefined;
          const invalid =
            request.result !== undefined && !isPlayerState(request.result);
          if (invalid && !reset)
            throw new InvalidPlayerStateError(request.result);
          result =
            request.result === undefined || invalid
              ? createPlayerState(locale)
              : request.result;
          if (invalid && reset) result = { ...result, epoch: reset.epoch };
          for (const operation of operations)
            result = applyPlayerOperation(result, operation);
          if (operations.length || request.result === undefined) {
            result = { ...result, revision: result.revision + 1 };
            store.put(result, "current");
          }
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
    });
  }
}
