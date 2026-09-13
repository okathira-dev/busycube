import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { DriveReplica } from "../drive/driveBackup";
import type { DriveFailure, DriveState } from "../hooks/useDriveBackup";
import type { StorageState } from "../hooks/useProgress";
import type { ServiceWorkerState } from "../hooks/useServiceWorker";
import { type Locale, messages } from "../i18n";
import { ConfirmDialog } from "./ConfirmDialog";
import { LanguageSelect } from "./LanguageSelect";

type Confirmation =
  | { kind: "reset" }
  | { kind: "delete-drive" }
  | { kind: "delete-replica"; replica: DriveReplica };

interface Props {
  headingId: string;
  locale: Locale;
  storageState: StorageState;
  storageMessage: string;
  serviceWorkerState: ServiceWorkerState;
  serviceWorkerMessage: string;
  driveState: DriveState;
  driveStatusMessage: string;
  driveConfigured: boolean;
  driveConnected: boolean;
  driveFailure: DriveFailure | null;
  driveFailureMessage: string;
  onLocaleChange(locale: Locale): void;
  onExport(): void;
  onReset(): void;
  onApplyUpdate(): void;
  onDriveSync(): void;
  onDriveDisconnect(): void;
  onDriveDelete(): void;
  onDriveRetry(): void;
  onDriveDismissFailure(): void;
  onDriveExportReplica(replica: DriveReplica): void;
  onDriveRemoveReplica(replica: DriveReplica): void;
}

/** 設定値、現在状態、実行操作を混ぜずに読める設定画面を組み立てる。 */
export function SettingsView({
  headingId,
  locale,
  storageState,
  storageMessage,
  serviceWorkerState,
  serviceWorkerMessage,
  driveState,
  driveStatusMessage,
  driveConfigured,
  driveConnected,
  driveFailure,
  driveFailureMessage,
  onLocaleChange,
  onExport,
  onReset,
  onApplyUpdate,
  onDriveSync,
  onDriveDisconnect,
  onDriveDelete,
  onDriveRetry,
  onDriveDismissFailure,
  onDriveExportReplica,
  onDriveRemoveReplica,
}: Props) {
  const copy = messages[locale];
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const driveBusy = driveState === "authorizing" || driveState === "syncing";
  const confirmMessage =
    confirmation?.kind === "reset"
      ? copy.resetConfirm
      : confirmation?.kind === "delete-drive"
        ? copy.driveDeleteConfirm
        : confirmation?.kind === "delete-replica"
          ? copy.driveRemoveReplicaConfirm
          : "";
  const confirmLabel =
    confirmation?.kind === "reset"
      ? copy.resetProgress
      : confirmation?.kind === "delete-drive"
        ? copy.driveDelete
        : copy.driveRemoveReplica;

  const confirm = () => {
    const current = confirmation;
    setConfirmation(null);
    if (current?.kind === "reset") onReset();
    if (current?.kind === "delete-drive") onDriveDelete();
    if (current?.kind === "delete-replica") {
      onDriveRemoveReplica(current.replica);
    }
  };

  return (
    <Paper
      component="section"
      className="panel"
      aria-labelledby={headingId}
      variant="outlined"
    >
      <Stack spacing={3}>
        <Typography id={headingId} variant="h4" component="h2">
          {copy.settings}
        </Typography>

        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="h6" component="h3">
            {copy.language}
          </Typography>
          <LanguageSelect
            locale={locale}
            label={copy.language}
            onChange={onLocaleChange}
          />
        </Stack>

        <Divider />
        <Alert
          severity={
            storageState === "ready" || storageState === "loading"
              ? "success"
              : "warning"
          }
          role="status"
        >
          {storageMessage}
        </Alert>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            onClick={onExport}
          >
            {copy.exportProgress}
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<RestartAltOutlined />}
            onClick={() => setConfirmation({ kind: "reset" })}
          >
            {copy.resetProgress}
          </Button>
        </Stack>

        <Divider />
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography variant="h6" component="h3">
            {copy.pwa}
          </Typography>
          <Alert
            severity={serviceWorkerState === "error" ? "warning" : "info"}
            role="status"
          >
            {serviceWorkerMessage}
          </Alert>
          {serviceWorkerState === "update-ready" && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<InstallDesktopOutlined />}
              onClick={onApplyUpdate}
            >
              {copy.pwaApplyUpdate}
            </Button>
          )}
        </Stack>

        <Divider />
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography variant="h6" component="h3">
            {copy.drive}
          </Typography>
          <Alert
            severity={driveState === "error" ? "warning" : "info"}
            role="status"
          >
            {driveStatusMessage}
          </Alert>
          {driveConfigured && (
            <Button
              variant="contained"
              startIcon={<CloudSyncOutlined />}
              loading={driveBusy}
              onClick={onDriveSync}
            >
              {copy.driveSync}
            </Button>
          )}
          <Typography color="text.secondary">
            {copy.driveMergeNotice}
          </Typography>

          {driveFailure && (
            <Alert severity="warning" className="drive-recovery">
              <Stack spacing={1.5}>
                <Typography>{driveFailureMessage}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Button size="small" onClick={onDriveRetry}>
                    {copy.driveRetry}
                  </Button>
                  <Button size="small" onClick={onDriveDismissFailure}>
                    {copy.driveContinueLocal}
                  </Button>
                </Stack>
                {driveFailure.replicas.map((replica) => (
                  <Stack
                    className="drive-recovery__replica"
                    spacing={1}
                    key={replica.id}
                  >
                    <code>{replica.name}</code>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Button
                        size="small"
                        onClick={() => onDriveExportReplica(replica)}
                      >
                        {copy.driveExportReplica}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setConfirmation({ kind: "delete-replica", replica })
                        }
                      >
                        {copy.driveRemoveReplica}
                      </Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Alert>
          )}

          {driveConnected && (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Button onClick={onDriveDisconnect}>
                {copy.driveDisconnect}
              </Button>
              <Button
                color="error"
                onClick={() => setConfirmation({ kind: "delete-drive" })}
              >
                {copy.driveDelete}
              </Button>
            </Stack>
          )}
        </Stack>

        <Alert severity="info">{copy.privacy}</Alert>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Link href={`./privacy/index.html?locale=${locale}`}>
            {copy.privacyPolicy}
          </Link>
          <Link href={`./terms/index.html?locale=${locale}`}>
            {copy.termsOfService}
          </Link>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmLabel}
        message={confirmMessage}
        cancelLabel={copy.cancel}
        confirmLabel={confirmLabel}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirm}
      />
    </Paper>
  );
}
