import AdsClickOutlined from "@mui/icons-material/AdsClickOutlined";
import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-610
 *
 * 目的: modal dialogを内側button、backdrop light dismiss、Escape cancelという三つのnative経路で閉じ分ける。
 * 最初の一手: 「ダイアログを開く」を押し、まずdialog内の閉じるbuttonを使う。再び開いて外側、もう一度開いてEscapeを試す。
 * 箱ごとの解法:
 * - B01「内側ボタンの箱」: dialog内buttonがclose kindを`button`にして`dialog.close()`し、その後の`close` eventで開く。
 * - B02「外側クリックの箱」: `closedby="any"`のmodal backdrop自身をclickしてkindを`dismiss`にし、native light dismiss後の`close` eventで開く。
 * - B03「Escapeの箱」: dialog上のEscape keydownまたはnative`cancel` eventでkindが`cancel`になり、その後の`close` eventで開く。
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
      <button type="button" className="stage-action" onClick={open}>
        {stageText(props.locale, locale.openDialog)}
      </button>
      <dialog
        ref={dialogRef}
        aria-label={stageText(props.locale, locale.tryClose)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          closeKind.current = "dismiss";
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeKind.current = "cancel";
        }}
      >
        <p>
          <strong>{stageText(props.locale, locale.tryClose)}</strong>
        </p>
        <p>{stageText(props.locale, locale.instruction)}</p>
        <button
          type="button"
          onClick={() => {
            closeKind.current = "button";
            dialogRef.current?.close();
          }}
        >
          {stageText(props.locale, locale.close)}
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
      icon: KeyboardReturnOutlined,
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
