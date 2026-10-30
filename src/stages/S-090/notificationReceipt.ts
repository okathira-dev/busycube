const databaseName = "busycube-notification-receipts";
const storeName = "attempts";
const slot = "S-090";

function openDatabase(signal: AbortSignal) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(databaseName, 1);
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      reject(error);
    };
    const abort = () =>
      fail(signal.reason ?? new DOMException("Aborted", "AbortError"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error("Notification storage blocked"));
    request.onsuccess = () => {
      signal.removeEventListener("abort", abort);
      if (settled || signal.aborted) {
        request.result.close();
        abort();
        return;
      }
      settled = true;
      resolve(request.result);
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

async function transaction<T>(
  signal: AbortSignal,
  action: (store: IDBObjectStore, result: (value: T) => void) => void,
) {
  const database = await openDatabase(signal);
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    let result: T;
    const abort = () => {
      try {
        transaction.abort();
      } catch {
        /* Already committed. */
      }
    };
    const finish = () => {
      signal.removeEventListener("abort", abort);
      database.close();
    };
    transaction.oncomplete = () => {
      finish();
      resolve(result);
    };
    transaction.onerror = () => {
      finish();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      finish();
      reject(
        signal.reason ??
          transaction.error ??
          new Error("Notification transaction aborted"),
      );
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      action(transaction.objectStore(storeName), (value) => {
        result = value;
      });
    } catch (error) {
      abort();
      finish();
      reject(error);
    }
    if (signal.aborted) abort();
  });
}

export function prepareNotificationAttempt(nonce: string, signal: AbortSignal) {
  return transaction<void>(signal, (store, result) => {
    store.put({ nonce, state: "pending" }, slot);
    result(undefined);
  });
}
export function consumeNotificationClick(nonce: string, signal: AbortSignal) {
  return transaction<boolean>(signal, (store, result) => {
    result(false);
    const request = store.get(slot);
    request.onsuccess = () => {
      const value: unknown = request.result;
      if (
        value &&
        typeof value === "object" &&
        "nonce" in value &&
        value.nonce === nonce &&
        "state" in value &&
        value.state === "clicked"
      ) {
        store.delete(slot);
        result(true);
      }
    };
  });
}
