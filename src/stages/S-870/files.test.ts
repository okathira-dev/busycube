import { prepareDirectory, replacementText, scanDirectory } from "./files";

function fixture(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const write = vi.fn<(data: FileSystemWriteChunkType) => Promise<void>>(
    async () => {},
  );
  const abort = vi.fn(async () => {});
  const close = vi.fn(async () => {});
  const handles: { getFile: ReturnType<typeof vi.fn<() => Promise<File>>> }[] =
    [];
  const getFileHandle = vi.fn(
    async (name: string, options?: FileSystemGetFileOptions) => {
      if (!files.has(name)) {
        if (!options?.create)
          throw new DOMException("Missing", "NotFoundError");
        files.set(name, "");
      }
      const getFile = vi.fn(
        async () => new File([files.get(name) ?? ""], name),
      );
      handles.push({ getFile });
      return {
        getFile,
        async createWritable() {
          let pending = "";
          return {
            async write(data: FileSystemWriteChunkType) {
              await write(data);
              if (typeof data !== "string") throw new Error("Expected text");
              pending = data;
            },
            async close() {
              await close();
              files.set(name, pending);
            },
            abort,
          };
        },
      } as unknown as FileSystemFileHandle;
    },
  );
  const directory = {
    getFileHandle,
    async *values() {
      for (const name of files.keys()) yield { name, kind: "file" };
    },
  } as unknown as FileSystemDirectoryHandle;
  return { directory, files, write, abort, close, getFileHandle, handles };
}

it("prepares only an empty selected directory and leaves nonempty files untouched", async () => {
  const f = fixture();
  expect(
    await prepareDirectory(f.directory, new AbortController().signal),
  ).toBe(true);
  expect([...f.files.keys()].sort()).toEqual([
    "delete-me.txt",
    "rewrite-me.txt",
  ]);
  expect(f.files.get("rewrite-me.txt")).toBe("\uFEFFreplace this line\n");
  expect(f.files.get("delete-me.txt")).toBe("\uFEFFdelete this file\n");
  const nonempty = fixture({ "keep.txt": "existing private fixture" });
  expect(
    await prepareDirectory(nonempty.directory, new AbortController().signal),
  ).toBe(false);
  expect(nonempty.write).not.toHaveBeenCalled();
  expect(nonempty.getFileHandle).not.toHaveBeenCalled();
  expect(nonempty.files.get("keep.txt")).toBe("existing private fixture");
});

it("preserves the exact LF edit rule and accepts any nonempty created file", async () => {
  const f = fixture({
    "create-me.txt": "arbitrary content unlike the reference",
    "rewrite-me.txt": "",
  });
  for (const [text, expected] of [
    [replacementText, true],
    [`\uFEFF${replacementText}`, true],
    [replacementText.replace("\n", "\r\n"), false],
    [replacementText.trimEnd(), false],
    [`${replacementText}extra`, false],
  ] as const) {
    f.files.set("rewrite-me.txt", text);
    const result = await scanDirectory(
      f.directory,
      new AbortController().signal,
    );
    expect(result.rewrite).toBe(expected);
    expect(result.created).toBe(true);
    expect(result.deleted).toBe(true);
    expect(result.error).toBeUndefined();
  }
  f.files.set("create-me.txt", "");
  expect(
    (await scanDirectory(f.directory, new AbortController().signal)).created,
  ).toBe(false);
});

it("does not interpret permission or type failures as deletion", async () => {
  const f = fixture({
    "rewrite-me.txt": replacementText,
    "create-me.txt": "x",
  });
  const original = f.getFileHandle.getMockImplementation();
  if (!original) throw new Error("Missing fixture");
  for (const name of ["NotAllowedError", "TypeMismatchError"]) {
    f.getFileHandle.mockImplementation(async (file, options) => {
      if (file === "delete-me.txt") throw new DOMException("Failed", name);
      return original(file, options);
    });
    const result = await scanDirectory(
      f.directory,
      new AbortController().signal,
    );
    expect(result.deleted).toBe(false);
    expect(result.rewrite && result.created).toBe(true);
    expect(result.error).toMatchObject({ name });
  }
});

it("aborts an interrupted writable without closing it or proceeding to another seed", async () => {
  const f = fixture();
  const controller = new AbortController();
  f.write.mockImplementation(async () => {
    controller.abort();
  });
  await expect(
    prepareDirectory(f.directory, controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(f.abort).toHaveBeenCalledOnce();
  expect(f.close).not.toHaveBeenCalled();
  expect(f.files.has("delete-me.txt")).toBe(false);
});
