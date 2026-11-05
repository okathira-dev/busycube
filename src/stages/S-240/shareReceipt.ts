const databaseName = "busycube-share-receipts";
const storeName = "attempts";
const slot = "S-240";

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
    request.onblocked = () => fail(new Error("Share storage blocked"));
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
          new Error("Share transaction aborted"),
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

type Attempt = {
  nonce: string;
  locale: "ja" | "en";
  state: "pending" | "returned";
};
function attempt(value: unknown): Attempt | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("nonce" in value) ||
    typeof value.nonce !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      value.nonce,
    ) ||
    !("locale" in value) ||
    (value.locale !== "ja" && value.locale !== "en") ||
    !("state" in value) ||
    (value.state !== "pending" && value.state !== "returned")
  )
    return null;
  return { nonce: value.nonce, locale: value.locale, state: value.state };
}
export function prepareShareAttempt(locale: "ja" | "en", signal: AbortSignal) {
  return transaction<string>(signal, (store, result) => {
    const read = store.get(slot);
    read.onsuccess = () => {
      const old = attempt(read.result);
      if (old) {
        result(old.nonce);
        return;
      }
      const nonce = crypto.randomUUID();
      store.put({ nonce, locale, state: "pending" } satisfies Attempt, slot);
      result(nonce);
    };
  });
}
export function receiveSharedMarks(
  nonces: readonly string[],
  signal: AbortSignal,
) {
  return transaction<"ja" | "en" | null>(signal, (store, result) => {
    result(null);
    const read = store.get(slot);
    read.onsuccess = () => {
      const value = attempt(read.result);
      if (value?.state !== "pending" || !nonces.includes(value.nonce)) return;
      store.put({ ...value, state: "returned" } satisfies Attempt, slot);
      result(value.locale);
    };
  });
}
export function consumeReturnedShare(signal: AbortSignal) {
  return transaction<boolean>(signal, (store, result) => {
    result(false);
    const read = store.get(slot);
    read.onsuccess = () => {
      if (attempt(read.result)?.state !== "returned") return;
      store.delete(slot);
      result(true);
    };
  });
}
