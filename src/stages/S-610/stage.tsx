import "./styles.css";
import AdsClickOutlined from "@mui/icons-material/AdsClickOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { createSvgIcon } from "@mui/material/utils";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

const EscapeIcon = createSvgIcon(
  <>
    <rect
      x="1"
      y="4"
      width="22"
      height="16"
      rx="3"
      fill="none"
      stroke="currentColor"
    />
    <text x="12" y="15" fontSize="8" textAnchor="middle">
      Esc
    </text>
  </>,
  "EscapeKey",
);

import { useEffect, useRef } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-610
 *
 * 目的: modal dialogを内側button、backdrop light dismiss、Escape cancelという三つのnative経路で閉じ分ける。
 * 最初の一手: 窓アイコンを押してdialogを開き、内側の×を押す。
 * 箱ごとの解法:
 * - B01「窓」: dialog内の閉じるbuttonを押す。dialog内buttonがclose kindを`button`にして`dialog.close()`し、その後の`close` eventで開く。
 * - B02「指先」: dialogを開き、外側のbackdropをクリックする。`closedby="any"`のmodal backdrop自身をclickしてkindを`dismiss`にし、native light dismiss後の`close` eventで開く。
 * - B03「Escキー」: dialogを開いてEscapeを押す。dialog上のEscape keydownまたはnative`cancel` eventでkindが`cancel`になり、その後の`close` eventで開く。
 * 使用API: HTMLDialogElementの`showModal()` / `close()`、`closedby`、cancel/close events、backdrop clickとkeyboard event。
 * 権限・privacy: 権限・入力dataを使用せず、直近のclose kindだけをmemoryで判定し、操作履歴を保存・送信しない。
 * 対応環境: modal dialogと`closedby="any"`によるnative light dismiss、cancel/close eventsを実装するbrowser。
 */
function S610Stage(props: Props) {
  const button = props.boxes[manifest.box.B01];
  const lightDismiss = props.boxes[manifest.box.B02];
  const cancel = props.boxes[manifest.box.B03];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeKind = useRef<"button" | "dismiss" | "cancel" | undefined>(
    undefined,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute("closedby", "any");
    const handleCancel = () => {
      closeKind.current = "cancel";
    };
    const handleClose = () => {
      const kind = closeKind.current;
      if (kind === "button") button.solve();
      if (kind === "dismiss") lightDismiss.solve();
      if (kind === "cancel") cancel.solve();
      closeKind.current = undefined;
    };
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
    };
  }, [button.solve, cancel.solve, lightDismiss.solve]);

  const open = () => dialogRef.current?.showModal();

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={button} locale={props.locale} />
        <StageProblemGiftBox box={lightDismiss} locale={props.locale} />
        <StageProblemGiftBox box={cancel} locale={props.locale} />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={open}
        aria-label={stageText(props.locale, locale.openDialog)}
      >
        <WindowOutlined aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className="close-path-dialog"
        aria-label={stageText(props.locale, locale.dialog)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          closeKind.current = "dismiss";
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeKind.current = "cancel";
        }}
      >
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.close)}
          onClick={() => {
            closeKind.current = "button";
            dialogRef.current?.close();
          }}
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      </dialog>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: WindowOutlined,
      color: "#f97316",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: AdsClickOutlined,
      color: "#ea580c",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: EscapeIcon,
      color: "#c2410c",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "HTMLDialogElement" in window ? "available" : "unsupported",
    ),
  Component: S610Stage,
});
