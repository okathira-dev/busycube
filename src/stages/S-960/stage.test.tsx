// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { DownloadState } from "./client";
import { stage } from "./stage";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  request: vi.fn(),
  fetch: vi.fn(),
  get: vi.fn(),
}));
vi.mock("./client", async (original) => ({
  ...(await original<typeof import("./client")>()),
  downloadWorker: mocks.connect,
  downloadRequest: mocks.request,
}));
const id = "busycube-s960-11111111-1111-4111-8111-111111111111";
let state: DownloadState;
let download: EventTarget & {
  id: string;
  downloaded: number;
  downloadTotal: number;
  result: string;
};
function fixture(saved = false) {
  const controller = new AbortController(),
    b1 = vi.fn(),
    b2 = vi.fn();
  const definition1 = stage.boxes.B01,
    definition2 = stage.boxes.B02;
  if (!definition1 || !definition2) throw new Error("Missing boxes");
  const props: StageComponentProps = {
    signal: controller.signal,
    locale: "en",
    services: {},
    progress: { hasMarker: () => false, mark: vi.fn() },
    boxes: {
      B01: {
        id: "B01",
        definition: definition1,
        state: saved ? "closed" : "ribboned",
        solve: b1,
      },
      B02: { id: "B02", definition: definition2, state: "ribboned", solve: b2 },
    },
  };
  return { props, controller, b1, b2 };
}
beforeEach(() => {
  state = { id: null, status: "idle", successId: null, abortId: null };
  download = Object.assign(new EventTarget(), {
    id,
    downloaded: 0,
    downloadTotal: 65536,
    result: "",
  });
  mocks.connect.mockImplementation(async () => ({
    registration: { backgroundFetch: { fetch: mocks.fetch, get: mocks.get } },
    worker: {},
  }));
  mocks.fetch.mockResolvedValue(download);
  mocks.get.mockResolvedValue(undefined);
  mocks.request.mockImplementation(async (_worker, action: string) => {
    if (action === "prepare") state = { ...state, id, status: "prepared" };
    if (action === "arm") state = { ...state, status: "active" };
    return state;
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const click = () =>
  act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Down arrow with check:/ }),
    );
  });
it("reads without starting and prepares/fetches/arms only from the box, never credits progress/result alone", async () => {
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
  await click();
  expect(mocks.fetch).toHaveBeenCalledWith(
    id,
    [`${location.origin}/background-fetch/parcel.bin?trial=${id}`],
    expect.objectContaining({ downloadTotal: 65536 }),
  );
  download.downloaded = 65536;
  download.result = "success";
  await act(async () => {
    download.dispatchEvent(new Event("progress"));
  });
  expect(f.b1).not.toHaveBeenCalled();
  expect(f.b2).not.toHaveBeenCalled();
  expect(screen.getByRole("progressbar")).toHaveProperty("value", 65536);
});
it("receives stored real-event receipts on revisit but does not reopen saved history or accept failure as abort", async () => {
  state = { id, status: "success", successId: id, abortId: null };
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  expect(f.b1).toHaveBeenCalledOnce();
  expect(f.b2).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(f.b1).toHaveBeenCalledOnce();
  cleanup();
  const saved = fixture(true);
  await act(async () => {
    render(<stage.Component {...saved.props} />);
  });
  expect(saved.b1).not.toHaveBeenCalled();
  state = { id, status: "failed", successId: null, abortId: null };
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(saved.b2).not.toHaveBeenCalled();
});
it("removes progress watchers on leave and does not expose or call a merchant abort", async () => {
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  await click();
  const remove = vi.spyOn(download, "removeEventListener");
  await act(async () => f.controller.abort());
  expect(remove).toHaveBeenCalledWith("progress", expect.any(Function));
  expect(
    screen.queryByRole("button", { name: /cancel|abort|stop/i }),
  ).toBeNull();
  state = { id, status: "aborted", successId: null, abortId: id };
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    download.dispatchEvent(new Event("progress"));
  });
  expect(f.b1).not.toHaveBeenCalled();
  expect(f.b2).not.toHaveBeenCalled();
});
