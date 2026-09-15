// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  progress: {
    document: {
      schemaVersion: 1 as const,
      installationId: "test",
      stages: {},
      settings: { locale: "en" as const },
    },
    storageState: "ready" as const,
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

import { App } from "./App";

describe("App shell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?locale=en");
    window.scrollTo = vi.fn();
    document.head.innerHTML = '<meta name="description" content="">';
  });

  it("uses link navigation and updates page metadata", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy(),
    );
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
});
