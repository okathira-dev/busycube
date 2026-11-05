// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type {
  DriveStageSyncResult,
  StageComponentProps,
} from "../../runtime/stageContract";
import { stage } from "./stage";

function fixture(configured = true) {
  const abort = new AbortController();
  const sync = vi.fn(
    async (): Promise<DriveStageSyncResult> => ({
      synced: true,
      remoteDevice: false,
    }),
  );
  const solve = vi.fn();
  const definition = stage.boxes.B02;
  if (!definition) throw new Error("Missing stage box");
  const p: StageComponentProps = {
    locale: "en",
    signal: abort.signal,
    boxes: { B02: { id: "B02", definition, state: "closed", solve } },
    progress: { hasMarker: () => true, mark: vi.fn() },
    services: { drive: { configured, sync } },
  };
  return { p, abort, sync, solve };
}
afterEach(cleanup);

it("shows one replay box and settings while an unconfigured service or old progress never starts a sync", async () => {
  const f = fixture(false);
  const view = render(<stage.Component {...f.p} />);
  expect(view.container.querySelectorAll(".problem-gift")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: "Settings" }).getAttribute("href"),
  ).toContain("view=settings");
  expect(screen.getByRole("status").textContent).toBe(
    "Google Drive is not configured",
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Two overlapping frames/ }),
  );
  await act(async () => {});
  expect(f.sync).not.toHaveBeenCalled();
  expect(f.solve).not.toHaveBeenCalled();
  expect(
    view.container
      .querySelector(".s140-link__arrival")
      ?.getAttribute("visibility"),
  ).toBe("hidden");
});

it("requires a fresh successful sync from another installation and only then animates arrival", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  const button = screen.getByRole("button", { name: /Two overlapping frames/ });
  expect(f.sync).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(button));
  expect(f.solve).not.toHaveBeenCalled();
  expect(
    view.container
      .querySelector(".s140-link__arrival")
      ?.getAttribute("visibility"),
  ).toBe("hidden");
  f.sync.mockResolvedValueOnce({ synced: false, remoteDevice: true });
  await act(async () => fireEvent.click(button));
  expect(f.solve).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Error");
  f.sync.mockRejectedValueOnce(new Error("offline"));
  await act(async () => fireEvent.click(button));
  expect(f.solve).not.toHaveBeenCalled();
  f.sync.mockResolvedValueOnce({ synced: true, remoteDevice: true });
  await act(async () => fireEvent.click(button));
  expect(f.solve).toHaveBeenCalledOnce();
  expect(
    view.container
      .querySelector(".s140-link__arrival")
      ?.getAttribute("visibility"),
  ).toBe("visible");
  expect(view.container.querySelector('[data-matched="true"]')).not.toBeNull();
  await act(async () => fireEvent.click(button));
  expect(f.sync).toHaveBeenCalledTimes(4);
  expect(f.solve).toHaveBeenCalledOnce();
});

it("serializes repeated box clicks and ignores a late sync after abort", async () => {
  const f = fixture();
  let finish: (result: DriveStageSyncResult) => void = () => {};
  f.sync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  const button = screen.getByRole("button", { name: /Two overlapping frames/ });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(f.sync).toHaveBeenCalledOnce();
  expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull();
  act(() => f.abort.abort());
  await act(async () => finish({ synced: true, remoteDevice: true }));
  expect(f.solve).not.toHaveBeenCalled();
  expect(
    view.container
      .querySelector(".s140-link__arrival")
      ?.getAttribute("visibility"),
  ).toBe("hidden");
});

it("does not notify a departed stage even if a shared sync later finishes", async () => {
  const f = fixture();
  let finish: (result: DriveStageSyncResult) => void = () => {};
  f.sync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  fireEvent.click(
    screen.getByRole("button", { name: /Two overlapping frames/ }),
  );
  view.unmount();
  await act(async () => finish({ synced: true, remoteDevice: true }));
  expect(f.solve).not.toHaveBeenCalled();
});
