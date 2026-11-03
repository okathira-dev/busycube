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
    document: createProgressDocument("local"),
    storageState: "ready",
    setLocale: vi.fn(),
    solve: vi.fn(),
    hasMarker: vi.fn(() => false),
    mark: vi.fn(),
    settings: { locale: "en" },
    epoch: "epoch",
    initialized: true,
    mergeProgress: vi.fn(async () => true),
    retryStorage: vi.fn(async () => true),
    reset: vi.fn(async () => true),
  };
}

describe("useDriveBackup", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID", "client-id");
    driveMocks.requestDriveAccessToken.mockResolvedValue("token");
    driveMocks.syncDriveBackup.mockResolvedValue({
      document: createProgressDocument("local"),
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

  it.each([null, "local", "remote"])(
    "reports only the fresh remote installation (%s) and keeps the local identity",
    async (remoteInstallationId) => {
      const local = progress();
      let applied = local.document;
      local.mergeProgress = vi.fn(async (document) => {
        applied = document;
        return true;
      });
      driveMocks.syncDriveBackup.mockResolvedValueOnce({
        document: {
          ...local.document,
          stages: { "S-020": { solvedBoxIds: ["B01"] } },
        },
        remoteInstallationId,
      });
      const { result } = renderHook(() => useDriveBackup(local));
      await act(async () => {
        expect(await result.current.sync()).toEqual({
          synced: true,
          remoteDevice: remoteInstallationId === "remote",
        });
      });
      expect(applied.sourceStorageId).toBe("local");
      expect(applied.stages["S-020"]?.solvedBoxIds).toEqual(["B01"]);
      driveMocks.syncDriveBackup.mockRejectedValueOnce(new Error("offline"));
      await act(async () => {
        expect(await result.current.sync()).toEqual({
          synced: false,
          remoteDevice: false,
        });
      });
      expect(local.mergeProgress).toHaveBeenCalledOnce();
    },
  );
});

it("leaves syncing state when the progress generation rejects a late result", async () => {
  vi.stubEnv("VITE_BUSYCUBE_DRIVE_GOOGLE_CLIENT_ID", "client-id");
  driveMocks.requestDriveAccessToken.mockResolvedValue("token");
  const local = progress();
  local.mergeProgress = vi.fn(async () => false);
  driveMocks.syncDriveBackup.mockResolvedValue({
    document: local.document,
    remoteInstallationId: null,
  });
  const { result } = renderHook(() => useDriveBackup(local));
  await act(async () => {
    expect(await result.current.sync()).toEqual({
      synced: false,
      remoteDevice: false,
    });
  });
  expect(result.current.state).toBe("idle");
  vi.unstubAllEnvs();
});
