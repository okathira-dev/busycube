import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useState } from "react";
import type { DriveState } from "../hooks/useDriveBackup";

interface Props {
  state: DriveState;
  message: string;
  openSettingsLabel: string;
  onOpenSettings(): void;
}

/** 画面を移動しても、利用者が開始したDrive操作の経過と結果を同じ通知で追跡する。 */
export function DriveSyncToast({
  state,
  message,
  openSettingsLabel,
  onOpenSettings,
}: Props) {
  const [open, setOpen] = useState(false);
  const busy = state === "authorizing" || state === "syncing";
  const failed = state === "error";
  const completed = state === "success" || state === "deleted";

  useEffect(() => {
    setOpen(busy || failed || completed);
  }, [busy, completed, failed]);

  return (
    <Snackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      autoHideDuration={completed ? 4000 : null}
      open={open}
      onClose={(_, reason) => {
        if (reason !== "clickaway") setOpen(false);
      }}
    >
      <Alert
        action={
          failed ? (
            <Button color="inherit" size="small" onClick={onOpenSettings}>
              {openSettingsLabel}
            </Button>
          ) : undefined
        }
        icon={
          busy ? <CircularProgress aria-hidden="true" size={20} /> : undefined
        }
        role={failed ? "alert" : "status"}
        severity={failed ? "error" : completed ? "success" : "info"}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
