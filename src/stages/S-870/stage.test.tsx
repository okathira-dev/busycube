// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

const backend = vi.hoisted(() => ({
  prepare: vi.fn<
    (
      _directory: FileSystemDirectoryHandle,
      _signal: AbortSignal,
    ) => Promise<boolean>
  >(async () => true),
  scan: vi.fn<
    (
      _directory: FileSystemDirectoryHandle,
      _signal: AbortSignal,
    ) => Promise<{
      rewrite: boolean;
      deleted: boolean;
      created: boolean;
      error?: unknown;
    }>
  >(async () => ({ rewrite: false, deleted: false, created: false })),
}));
vi.mock("./files", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./files")>()),
  prepareDirectory: backend.prepare,
  scanDirectory: backend.scan,
}));
function fixture() {
  const directory = {} as FileSystemDirectoryHandle;
  const picker = vi.fn(async () => directory);
  vi.stubGlobal("showDirectoryPicker", picker);
  const controller = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return { directory, picker, controller, p };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  backend.prepare.mockReset().mockResolvedValue(true);
  backend.scan
    .mockReset()
    .mockResolvedValue({ rewrite: false, deleted: false, created: false });
  vi.useRealTimers();
});

it("lets users inspect the reference folder and files without choosing or modifying real files", () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  fireEvent.click(screen.getByRole("button", { name: "archive" }));
  expect(screen.queryByRole("button", { name: "delete-me.txt" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "rewrite-me.txt" }));
  expect(
    screen.getByRole("article", { name: "rewrite-me.txt" }).textContent,
  ).toContain("busycube{edited_outside_the_page}");
  expect(screen.getByText("UTF-8 · LF · final newline present")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "create-me.txt" }));
  expect(f.picker).not.toHaveBeenCalled();
  expect(backend.prepare).not.toHaveBeenCalled();
  expect(backend.scan).not.toHaveBeenCalled();
  for (const box of Object.values(f.p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});

it("requests readwrite consent and solves only from a new external scan, once per box", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Choose an empty folder" }),
    );
  });
  expect(f.picker).toHaveBeenCalledWith({ mode: "readwrite" });
  for (const box of Object.values(f.p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  backend.scan.mockResolvedValue({
    rewrite: true,
    deleted: true,
    created: true,
  });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  for (const box of Object.values(f.p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
});

it("keeps a nonempty directory unprepared and unobserved", async () => {
  const f = fixture();
  backend.prepare.mockResolvedValue(false);
  render(<stage.Component {...f.p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Choose an empty folder" }),
    );
  });
  expect(screen.getByRole("status").textContent).toContain("non-empty folder");
  expect(backend.scan).not.toHaveBeenCalled();
});

it("discards a late picker and does not prepare after departure", async () => {
  const f = fixture();
  let complete: ((directory: FileSystemDirectoryHandle) => void) | undefined;
  f.picker.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Choose an empty folder" }),
    );
  });
  view.unmount();
  await act(async () => {
    complete?.(f.directory);
  });
  expect(backend.prepare).not.toHaveBeenCalled();
  expect(backend.scan).not.toHaveBeenCalled();
});

it("stops listeners and timers on abort and ignores an in-flight scan", async () => {
  vi.useFakeTimers();
  const f = fixture();
  let complete:
    | ((result: {
        rewrite: boolean;
        deleted: boolean;
        created: boolean;
      }) => void)
    | undefined;
  backend.scan.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Choose an empty folder" }),
    );
  });
  await act(async () => {
    f.controller.abort();
    complete?.({ rewrite: true, deleted: true, created: true });
    vi.advanceTimersByTime(5000);
  });
  expect(vi.getTimerCount()).toBe(0);
  for (const box of Object.values(f.p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
