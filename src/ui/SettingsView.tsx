import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import DeleteForeverOutlined from "@mui/icons-material/DeleteForeverOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { type ChangeEvent, useLayoutEffect, useState } from "react";
import type { ProgressDocument } from "../domain/progress";
import type { DriveReplica } from "../drive/driveBackup";
import type { DriveFailure, DriveState } from "../hooks/useDriveBackup";
import type { StorageState } from "../hooks/useProgress";
import type { ServiceWorkerState } from "../hooks/useServiceWorker";
import { type Locale, messages } from "../i18n";
import { ConfirmDialog } from "./ConfirmDialog";
import type { ProgressImportResult } from "./progressImport";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

type Confirmation =
  | { kind: "reset" }
  | { kind: "delete-drive" }
  | { kind: "delete-replica"; replica: DriveReplica }
  | {
      kind: "import";
      document: ProgressDocument;
      addedBoxes: number;
      addedMarkers: number;
    };

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
  onExport(): void;
  onPrepareImport(file: File): Promise<ProgressImportResult>;
  onMergeImport(document: ProgressDocument): void;
  onReset(): Promise<boolean>;
  onApplyUpdate(): void;
  onDriveSync(): void;
  onDriveDisconnect(): void;
  onDriveDelete(): void;
  onDriveRetry(): void;
  onDriveDismissFailure(): void;
  onDriveExportReplica(replica: DriveReplica): void;
  onDriveRemoveReplica(replica: DriveReplica): void;
}

function LoadingStatus({ children }: { children: string }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: "center", gap: 1, color: "text.secondary" }}
    >
      <CircularProgress size={20} aria-hidden="true" />
      <Typography color="text.secondary">{children}</Typography>
    </Stack>
  );
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
  onExport,
  onPrepareImport,
  onMergeImport,
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
  useLayoutEffect(() => {
    document.getElementById(headingId)?.focus({ preventScroll: true });
  }, [headingId]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{
    severity: "success" | "warning";
    message: string;
  } | null>(null);
  const driveBusy = driveState === "authorizing" || driveState === "syncing";

  const importMessage =
    confirmation?.kind === "import"
      ? `${copy.importPreviewBoxes}: ${confirmation.addedBoxes} / ${copy.importPreviewMarkers}: ${confirmation.addedMarkers}. ${copy.importConfirm}`
      : "";
  const confirmMessage =
    confirmation?.kind === "reset"
      ? copy.resetConfirm
      : confirmation?.kind === "delete-drive"
        ? copy.driveDeleteConfirm
        : confirmation?.kind === "delete-replica"
          ? copy.driveRemoveReplicaConfirm
          : importMessage;
  const confirmLabel =
    confirmation?.kind === "reset"
      ? copy.resetProgress
      : confirmation?.kind === "delete-drive"
        ? copy.driveDelete
        : confirmation?.kind === "delete-replica"
          ? copy.driveRemoveReplica
          : copy.importProgress;

  const confirm = async () => {
    const current = confirmation;
    setConfirmation(null);
    if (current?.kind === "reset") {
      const reset = await onReset();
      setImportNotice({
        severity: reset ? "success" : "warning",
        message: reset ? copy.resetSuccess : copy.resetFailed,
      });
    }
    if (current?.kind === "delete-drive") onDriveDelete();
    if (current?.kind === "delete-replica") {
      onDriveRemoveReplica(current.replica);
    }
    if (current?.kind === "import") {
      onMergeImport(current.document);
      setImportNotice({ severity: "success", message: copy.importSuccess });
    }
  };

  const selectImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImporting(true);
    setImportNotice(null);
    const result = await onPrepareImport(file);
    setImporting(false);
    if (result.status === "future") {
      setImportNotice({
        severity: "warning",
        message: `${copy.importFuture} (${result.version})`,
      });
      return;
    }
    if (result.status === "corrupt" || result.status === "read-error") {
      setImportNotice({ severity: "warning", message: copy.importInvalid });
      return;
    }
    if (result.addedBoxes === 0 && result.addedMarkers === 0) {
      setImportNotice({ severity: "success", message: copy.importNoChanges });
      return;
    }
    setConfirmation({ kind: "import", ...result });
  };

  const storageStatus =
    storageState === "loading" ? (
      <LoadingStatus>{storageMessage}</LoadingStatus>
    ) : storageState === "ready" ? (
      <Typography color="text.secondary">{storageMessage}</Typography>
    ) : (
      <Alert severity="warning">{storageMessage}</Alert>
    );

  const pwaStatus =
    serviceWorkerState === "registering" ? (
      <LoadingStatus>{serviceWorkerMessage}</LoadingStatus>
    ) : serviceWorkerState === "error" ||
      serviceWorkerState === "unsupported" ? (
      <Alert severity="warning">{serviceWorkerMessage}</Alert>
    ) : serviceWorkerState === "update-ready" ? (
      <Alert severity="info">{serviceWorkerMessage}</Alert>
    ) : (
      <Typography color="text.secondary">{serviceWorkerMessage}</Typography>
    );

  const driveStatus = driveBusy ? (
    <LoadingStatus>{driveStatusMessage}</LoadingStatus>
  ) : driveState === "error" ? (
    <Alert severity="warning">{driveStatusMessage}</Alert>
  ) : driveState === "success" || driveState === "deleted" ? (
    <Alert severity="success">{driveStatusMessage}</Alert>
  ) : (
    <Typography color="text.secondary">{driveStatusMessage}</Typography>
  );

  return (
    <Paper
      component="section"
      className="panel"
      aria-labelledby={headingId}
      variant="outlined"
    >
      <Stack spacing={3}>
        <Typography id={headingId} variant="h4" component="h2" tabIndex={-1}>
          {copy.settings}
        </Typography>

        <Stack spacing={1.5}>
          <Typography variant="h6" component="h3">
            {copy.localProgress}
          </Typography>
          {storageStatus}
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlined />}
              onClick={onExport}
              disabled={storageState === "loading"}
            >
              {copy.exportProgress}
            </Button>
            <Button
              component="label"
              variant="outlined"
              startIcon={
                importing ? (
                  <CircularProgress size={18} />
                ) : (
                  <FileUploadOutlined />
                )
              }
              disabled={storageState !== "ready" || importing}
            >
              {copy.importProgress}
              <VisuallyHiddenInput
                type="file"
                accept="application/json,.json"
                onChange={selectImport}
              />
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<RestartAltOutlined />}
              onClick={() => setConfirmation({ kind: "reset" })}
              disabled={storageState === "loading"}
            >
              {copy.resetProgress}
            </Button>
          </Stack>
          {importNotice && (
            <Alert
              severity={importNotice.severity}
              onClose={() => setImportNotice(null)}
            >
              {importNotice.message}
            </Alert>
          )}
        </Stack>

        <Divider />
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h3">
            {copy.pwa}
          </Typography>
          {pwaStatus}
          {serviceWorkerState === "update-ready" && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<InstallDesktopOutlined />}
              onClick={onApplyUpdate}
              sx={{ alignSelf: "flex-start" }}
            >
              {copy.pwaApplyUpdate}
            </Button>
          )}
        </Stack>

        <Divider />
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h3">
            {copy.drive}
          </Typography>
          {driveStatus}
          <Typography color="text.secondary">
            {copy.driveStorageExplanation}
          </Typography>
          <Link
            href="https://developers.google.com/workspace/drive/api/guides/appdata"
            target="_blank"
            rel="noreferrer"
            sx={{ alignSelf: "flex-start" }}
          >
            {copy.driveStorageTechnical}
          </Link>
          <Typography color="text.secondary">
            {copy.driveMergeNotice}
          </Typography>
          {driveConfigured && (
            <Button
              variant="contained"
              startIcon={<CloudSyncOutlined />}
              loading={driveBusy}
              onClick={onDriveSync}
              sx={{ alignSelf: "flex-start" }}
            >
              {copy.driveSync}
            </Button>
          )}

          {driveFailure && (
            <Alert severity="warning" className="drive-recovery">
              <Stack spacing={1.5}>
                <Typography>{driveFailureMessage}</Typography>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
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
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
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
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                startIcon={<LinkOffOutlined />}
                onClick={onDriveDisconnect}
                disabled={driveBusy}
              >
                {copy.driveDisconnect}
              </Button>
              <Button
                color="error"
                startIcon={<DeleteForeverOutlined />}
                onClick={() => setConfirmation({ kind: "delete-drive" })}
                disabled={driveBusy}
              >
                {copy.driveDelete}
              </Button>
            </Stack>
          )}
        </Stack>

        <Divider />
        <Stack spacing={1.5}>
          <Typography variant="h6" component="h3">
            {copy.privacyAndDocuments}
          </Typography>
          <Typography color="text.secondary">{copy.privacy}</Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
            <Link href={`./privacy/index.html?locale=${locale}`}>
              {copy.privacyPolicy}
            </Link>
            <Link href={`./terms/index.html?locale=${locale}`}>
              {copy.termsOfService}
            </Link>
          </Stack>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmLabel}
        message={confirmMessage}
        cancelLabel={copy.cancel}
        confirmLabel={confirmLabel}
        confirmColor={confirmation?.kind === "import" ? "primary" : "error"}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirm()}
      />
    </Paper>
  );
}
