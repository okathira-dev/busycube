import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { StorageState } from "../hooks/useProgress";
import type { Locale } from "../i18n";
import { messages } from "../i18n";

interface Props {
  locale: Locale;
  state: StorageState;
  message: string;
  onOpenSettings(): void;
  onRetry(): Promise<boolean>;
}

/** 保存不能をプレイ画面からも見落とさず、回復操作へ戻れるようにする。 */
export function ProgressStorageAlert({
  locale,
  state,
  message,
  onOpenSettings,
  onRetry,
}: Props) {
  const copy = messages[locale];
  if (state === "ready" || state === "loading") return null;

  return (
    <Alert
      className="storage-alert"
      severity={state === "unavailable" ? "error" : "warning"}
      action={
        <Stack direction="row" sx={{ gap: 0.5 }}>
          {state === "unavailable" && (
            <Button color="inherit" size="small" onClick={() => void onRetry()}>
              {copy.storageRetry}
            </Button>
          )}
          <Button color="inherit" size="small" onClick={onOpenSettings}>
            {copy.storageOpenSettings}
          </Button>
        </Stack>
      }
    >
      {message}
    </Alert>
  );
}
