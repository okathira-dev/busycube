import PictureInPictureAltOutlined from "@mui/icons-material/PictureInPictureAltOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { stageText } from "../locale";
import { locale } from "./locale";

function copyDocumentStyles(target: Document) {
  for (const style of document.head.querySelectorAll(
    "link[rel='stylesheet'], style",
  )) {
    target.head.append(style.cloneNode(true));
  }
}

/**
 * S-850
 *
 * 目的: browser所有Document Picture-in-Picture windowの別documentへ実GiftBoxをReact portalで移し、そのwindow内で操作する。
 * 最初の一手: 「浮かぶ画面を開く」を押し、常時手前のPiP windowへ移った箱を探してclickする。
 * 箱ごとの解法:
 * - B01「浮かぶ文書の箱」: `requestWindow()`が返したdocumentへportalした箱をtrusted clickし、ownerDocumentがPiP document、native event viewが保持中PiP windowと一致すると開く。
 * 使用API: Document Picture-in-Picture API、React `createPortal()`、cross-document stylesheet clone、Window pagehide。
 * 権限・privacy: camera・screen capture・window内容を取得せず、browserが返したPiP Window/Document参照だけを表示中に保持する。dataを保存・送信しない。
 * 対応環境: Document Picture-in-Pictureを提供するdesktop Chromium系browser。
 */
function S850Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const windowRef = useRef<Window | null>(null);
  const [pipDocument, setPipDocument] = useState<Document>();
  const [status, setStatus] = useState("");

  useEffect(() => {
    const close = () => {
      windowRef.current?.close();
      windowRef.current = null;
      setPipDocument(undefined);
    };
    props.signal.addEventListener("abort", close, { once: true });
    return () => {
      props.signal.removeEventListener("abort", close);
      close();
    };
  }, [props.signal]);

  const open = async () => {
    const api = window.documentPictureInPicture;
    if (!api) return;
    windowRef.current?.close();
    try {
      const pipWindow = await api.requestWindow({ width: 360, height: 320 });
      windowRef.current = pipWindow;
      pipWindow.document.title = stageText(props.locale, locale.floatingTitle);
      copyDocumentStyles(pipWindow.document);
      const close = () => {
        if (windowRef.current === pipWindow) {
          windowRef.current = null;
          setPipDocument(undefined);
        }
      };
      pipWindow.addEventListener("pagehide", close, { once: true });
      setPipDocument(pipWindow.document);
      setStatus(stageText(props.locale, locale.opened));
    } catch {
      setStatus(stageText(props.locale, locale.unavailable));
    }
  };

  const floatingBox =
    pipDocument && windowRef.current
      ? createPortal(
          <main className="s850-floating-root">
            <h1>{stageText(props.locale, locale.floatingTitle)}</h1>
            <StageProblemGiftBox
              box={problem}
              locale={props.locale}
              onClick={(event) => {
                if (
                  event.isTrusted &&
                  event.currentTarget.ownerDocument === pipDocument &&
                  event.nativeEvent.view === windowRef.current
                ) {
                  problem.solve();
                }
              }}
            />
          </main>,
          pipDocument.body,
        )
      : null;

  return (
    <div className="puzzle puzzle--centered s850-stage">
      {floatingBox}
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <button
        type="button"
        className="stage-action"
        onClick={() => void open()}
      >
        {stageText(props.locale, locale.open)}
      </button>
      <output className="interaction-status" aria-live="polite">
        {pipDocument
          ? stageText(props.locale, locale.opened)
          : status || stageText(props.locale, locale.mainPlaceholder)}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: PictureInPictureAltOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      window.documentPictureInPicture ? "available" : "unsupported",
    ),
  Component: S850Stage,
});
