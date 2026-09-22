// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { createProgressDocument } from "../domain/progress";
import type { ProgressController } from "./useProgress";

const driveMocks = vi.hoisted(() => ({
  deleteDriveBackups: vi.fn(),
  deleteDriveReplica: vi.fn(),
  downloadDriveReplica: vi.fn(),
  syncDriveBackup: vi.fn(),
  requestDriveAccessToken: vi.fn(),
  revokeDriveAccessToken: vi.fn(),
}));

vi.mock("../drive/driveBackup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../drive/driveBackup")>()),
  deleteDriveBackups: driveMocks.deleteDriveBackups,
  deleteDriveReplica: driveMocks.deleteDriveReplica,
  downloadDriveReplica: driveMocks.downloadDriveReplica,
  syncDriveBackup: driveMocks.syncDriveBackup,
}));

vi.mock("../drive/googleIdentity", () => ({
  requestDriveAccessToken: driveMocks.requestDriveAccessToken,
  revokeDriveAccessToken: driveMocks.revokeDriveAccessToken,
}));

import { useDriveBackup } from "./useDriveBackup";

function progress(): ProgressController {
  return {
    document: createProgressDocument("en", "local"),
    storageState: "ready",
    setLocale: vi.fn(),
    solve: vi.fn(),
    hasMarker: vi.fn(() => false),
    mark: vi.fn(),
    replaceDocument: vi.fn(),
    retryStorage: vi.fn(async () => true),
    reset: vi.fn(async () => true),
  };
}

describe("useDriveBackup", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID", "client-id");
    driveMocks.requestDriveAccessToken.mockResolvedValue("token");
    driveMocks.syncDriveBackup.mockResolvedValue({
      document: createProgressDocument("en", "local"),
      remoteInstallationId: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("turns a revoke rejection into a recoverable error state", async () => {
    driveMocks.revokeDriveAccessToken.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useDriveBackup(progress()));

    await act(async () => {
      expect(await result.current.sync()).toEqual({
        synced: true,
        remoteDevice: false,
      });
    });
    await act(async () => {
      expect(await result.current.disconnect()).toBe(false);
    });

    expect(result.current.state).toBe("error");
    expect(result.current.failure).toEqual({ code: "unknown", replicas: [] });
  });
});
