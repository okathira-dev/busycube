import type { ButtonProps } from "@mui/material/Button";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useId } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor?: ButtonProps["color"];
  onCancel(): void;
  onConfirm(): void;
}

/** 破壊的操作の対象と結果を、実行前に読み返せる確認画面として示す。 */
export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmColor = "error",
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button color={confirmColor} variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
