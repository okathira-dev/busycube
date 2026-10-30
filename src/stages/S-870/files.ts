export const replacementText = "busycube{edited_outside_the_page}\n";
export const referenceFiles = {
  "rewrite-me.txt": replacementText,
  "create-me.txt": "busycube\n",
} as const;

function live(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
}
function missing(error: unknown) {
  return error instanceof DOMException && error.name === "NotFoundError";
}
export async function prepareDirectory(
  directory: FileSystemDirectoryHandle,
  signal: AbortSignal,
) {
  live(signal);
  for await (const _entry of directory.values()) {
    live(signal);
    return false;
  }
  live(signal);
  for (const [name, text] of [
    ["rewrite-me.txt", "replace this line\n"],
    ["delete-me.txt", "delete this file\n"],
  ] as const) {
    live(signal);
    try {
      await directory.getFileHandle(name);
      throw new DOMException(
        "Seed file already exists",
        "InvalidModificationError",
      );
    } catch (error) {
      if (!missing(error)) throw error;
    }
    live(signal);
    const file = await directory.getFileHandle(name, { create: true });
    live(signal);
    if ((await file.getFile()).size !== 0)
      throw new DOMException("Seed file changed", "InvalidModificationError");
    live(signal);
    const writable = await file.createWritable();
    try {
      live(signal);
      await writable.write(`\uFEFF${text}`);
      live(signal);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
  }
  live(signal);
  return true;
}

async function readFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  signal: AbortSignal,
) {
  live(signal);
  const handle = await directory.getFileHandle(name);
  live(signal);
  const file = await handle.getFile();
  live(signal);
  return file;
}
export async function scanDirectory(
  directory: FileSystemDirectoryHandle,
  signal: AbortSignal,
) {
  const results = await Promise.allSettled([
    (async () => {
      const file = await readFile(directory, "rewrite-me.txt", signal);
      if (
        file.size !== replacementText.length &&
        file.size !== replacementText.length + 3
      )
        return false;
      const text = await file.text();
      live(signal);
      return text === replacementText;
    })(),
    (async () => {
      try {
        live(signal);
        await directory.getFileHandle("delete-me.txt");
        live(signal);
        return false;
      } catch (error) {
        live(signal);
        if (missing(error)) return true;
        throw error;
      }
    })(),
    (async () =>
      (await readFile(directory, "create-me.txt", signal)).size > 0)(),
  ]);
  live(signal);
  const error = results.find(
    (result) => result.status === "rejected" && !missing(result.reason),
  );
  return {
    rewrite: results[0]?.status === "fulfilled" && results[0].value,
    deleted: results[1]?.status === "fulfilled" && results[1].value,
    created: results[2]?.status === "fulfilled" && results[2].value,
    error: error?.status === "rejected" ? (error.reason as unknown) : undefined,
  };
}
