// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  progress: {
    document: {
      schemaVersion: 1 as const,
      installationId: "test",
      stages: {},
      settings: { locale: "en" as const },
    },
    storageState: "ready" as
      | "loading"
      | "ready"
      | "unavailable"
      | "corrupt"
      | "future",
    setLocale: vi.fn(),
    solve: vi.fn(),
    hasMarker: vi.fn(() => false),
    mark: vi.fn(),
    replaceDocument: vi.fn(),
    retryStorage: vi.fn(async () => true),
    reset: vi.fn(async () => true),
  },
}));

vi.mock("./hooks/useProgress", () => ({
  useProgress: () => mocks.progress,
}));
vi.mock("./hooks/useDriveBackup", () => ({
  useDriveBackup: () => ({
    state: "unconfigured",
    configured: false,
    connected: false,
    failure: null,
    sync: vi.fn(),
    disconnect: vi.fn(),
    removeRemote: vi.fn(),
    exportFailedReplica: vi.fn(),
    removeFailedReplica: vi.fn(),
    dismissFailure: vi.fn(),
  }),
}));
vi.mock("./hooks/useServiceWorker", () => ({
  useServiceWorker: () => ({ state: "development", applyUpdate: vi.fn() }),
}));
// 画面遷移の検証を、実SettingsViewチャンクの変換・評価時間から分離する。
vi.mock(import("./ui/SettingsView"), () => ({
  SettingsView: ({ headingId }: { headingId: string }) => (
    <h2 id={headingId}>Settings</h2>
  ),
}));

import { App } from "./App";

describe("App shell", () => {
  beforeEach(() => {
    mocks.progress.storageState = "ready";
    window.history.replaceState({}, "", "/?locale=en");
    window.scrollTo = vi.fn();
    document.head.innerHTML = '<meta name="description" content="">';
  });

  it("uses link navigation and updates page metadata", async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    });

    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeTruthy();
    expect(new URL(window.location.href).searchParams.get("view")).toBe(
      "settings",
    );
    expect(document.title).toBe("Settings | Busycube: Web API Explorer");
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toContain("browser, device, permissions");
  });

  it("shows the requested stage shell while stored progress loads", () => {
    mocks.progress.storageState = "loading";
    window.history.replaceState({}, "", "/?locale=en&stage=S-000");

    render(<App />);

    expect(screen.getByRole("heading", { name: "The first box" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Loading stage");
    expect(screen.queryByRole("heading", { name: "Box room" })).toBeNull();
  });
});
