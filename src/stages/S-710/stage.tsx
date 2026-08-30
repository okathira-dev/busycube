import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";
import {
  type S710FlagKind,
  type S710LayoutMessage,
  s710Flags,
} from "./protocol";

const flagKinds = Object.keys(s710Flags) as S710FlagKind[];

/**
 * S-710
 *
 * 目的: same-origin iframe内の動画圧縮toolで入力・録画mediaを変換し、dark frame・decode破損・QR置換・二回目metadata overlayのflagを見つける。
 * 最初の一手: iframe toolへ動画を選ぶか10秒camera録画を行い、変換後videoを再生・downloadしてframeとmetadata表示を調べる。
 * 箱ごとの解法:
 * - B01「暗黒フレームの箱」: 変換結果の暗黒frameから得る固定flag`busycube{dark_frame}`を共通欄へtrim・小文字化完全一致で入力すると開く。
 * - B02「壊れた入力の箱」: decode不能inputの結果から得る固定flag`busycube{broken_input}`を完全一致で入力すると開く。
 * - B03「置換QRの箱」: 検出QR四辺形の差替え結果から得る固定flag`busycube{qr_replaced}`を完全一致で入力すると開く。
 * - B04「二回目の箱」: metadata overlayを含むsecond passから得る固定flag`busycube{second_pass}`を完全一致で入力すると開く。
 * 使用API: sandboxed same-origin iframe、MediaBunny、MediaRecorder、Canvas、jsQR、camera capture、session付き`postMessage()`によるlayout調整。
 * 権限・privacy: cameraはtool内で録画を選んだ時だけ使用し、入力/録画/変換mediaはclient memoryとobject URLだけで扱う。mediaと回答をserverへ送信しない。
 * 対応環境: MediaRecorder、HTMLVideoElement、Canvas、iframe downloadを実装し、必要ならcamera permissionを提供するbrowser。
 */
function S710Stage(props: Props) {
  const problems = [
    props.boxes.B01,
    props.boxes.B02,
    props.boxes.B03,
    props.boxes.B04,
  ] as const;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const session = useMemo(() => crypto.randomUUID(), []);
  const [iframeHeight, setIframeHeight] = useState(560);
  const [answer, setAnswer] = useState("");
  const toolUrl = useMemo(() => {
    const url = new URL("./tools/s710/index.html", document.baseURI);
    url.searchParams.set("session", session);
    url.searchParams.set("locale", props.locale);
    return url.href;
  }, [props.locale, session]);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      const message = event.data as Partial<S710LayoutMessage>;
      if (
        message.channel !== "busycube-s710-tool" ||
        message.type !== "layout" ||
        message.session !== session ||
        typeof message.height !== "number" ||
        !Number.isFinite(message.height)
      )
        return;
      setIframeHeight(Math.max(560, Math.ceil(message.height)));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [session]);

  return (
    <div className="puzzle s710-stage">
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <iframe
        ref={iframeRef}
        className="s710-tool-frame"
        src={toolUrl}
        title={stageText(props.locale, locale.iframeTitle)}
        allow="camera"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-downloads"
        style={{ height: iframeHeight }}
      />
      <label className="parallel-answer s710-answer">
        {stageText(props.locale, locale.answer)}
        <input
          value={answer}
          placeholder={stageText(props.locale, locale.placeholder)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setAnswer(next);
            const normalized = next.trim().toLowerCase();
            const kind = flagKinds.find(
              (candidate) => s710Flags[candidate] === normalized,
            );
            if (!kind) return;
            const index =
              kind === "dark"
                ? 0
                : kind === "broken"
                  ? 1
                  : kind === "qr"
                    ? 2
                    : 3;
            problems[index]?.solve();
          }}
        />
      </label>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VisibilityOffOutlined,
      color: "#f8fafc",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: FileDownloadOutlined,
      color: "#94a3b8",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: DevicesOutlined,
      color: "#64748b",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: FileUploadOutlined,
      color: "#475569",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "MediaRecorder" in window && "HTMLVideoElement" in window
        ? "available"
        : "unsupported",
    ),
  Component: S710Stage,
});
