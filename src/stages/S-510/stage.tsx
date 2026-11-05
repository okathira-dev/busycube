import "./styles.css";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import ReportGmailerrorredOutlined from "@mui/icons-material/ReportGmailerrorredOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { type DragEvent, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import { evaluateImageDrop } from "../../fixtures/nativeImageDrop";
import fixtures from "../../fixtures/stage-drag-contract.json";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type State = "idle" | "hover" | "rejected" | "accepted";
const columns = [
  { image: "page", box: "B04", alt: "dragImage" },
  { image: "file", box: "B05", alt: "blockedDragImage" },
  { image: "window", box: "B06", alt: "iframeImage" },
] as const;

/**
 * S-510
 *
 * 目的: 標準の画像DnDから対象Web URLと実Fileを受け取り、画像内容を照合する三箱。
 * 最初の一手: 左のドラッグ図を同じ列の箱へドラッグする。
 * 箱ごとの解法:
 * - B04「紙と上向き矢印」: 左の画像を同じ列の箱へ実ドラッグする。trusted dropのtext/uri-listに対象HTTP(S) URLがあり、受け取った実FileのSHA-256がpage画像と一致すると開く。
 * - B05「紙と下向き矢印」: 中央の禁止図の画像そのものを別タブや別窓で開き、その画像を箱へ実ドラッグする。対象Web URLと実File内容がfile画像へ両方一致すると開く。保存ファイルだけでは開かない。
 * - B06「窓」: 同じステージを別窓で開き、そのiframe内画像を元の箱へ実ドラッグする。対象Web URLと実File内容がwindow画像へ両方一致すると開く。同じページのopaque iframeから実Fileが取得できない経路では開かない。
 * 使用API: HTML Drag and Drop、DataTransferのtext/uri-list/files、File.arrayBuffer、Web Crypto SHA-256、sandbox iframe。
 * 権限・privacy: 最初の1MiB以下の実Fileだけを端末内でhash照合する。内容・file名・履歴は保存・送信しない。URIだけをfetchした成功、独自marker・開始通知・別窓登録・時間制限は使わない。
 * 対応環境: 標準画像DnDでHTTP(S) URLと実Fileを返すdesktop browser。URLは画像resourceの識別であり、元ページの認証やOS由来の厳密な証明ではない。
 */
function S510Stage(props: Props) {
  const [states, setStates] = useState<
    Partial<Record<"B04" | "B05" | "B06", State>>
  >({});
  const base = new URL("./", window.location.href).href;
  const set = (box: "B04" | "B05" | "B06", state: State) =>
    setStates((previous) => ({ ...previous, [box]: state }));
  const drop = async (
    event: DragEvent<HTMLElement>,
    column: (typeof columns)[number],
  ) => {
    event.preventDefault();
    const transfer = event.dataTransfer;
    const uri = transfer.getData("text/uri-list");
    const file = transfer.files[0];
    if (!event.isTrusted || !file || file.size > 1_048_576) {
      set(column.box, "rejected");
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      if (props.signal.aborted) return;
      const digest = [...new Uint8Array(hash)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const accepted = evaluateImageDrop(uri, digest, base, fixtures).some(
        (check) => check.image === column.image && check.accepted,
      );
      set(column.box, accepted ? "accepted" : "rejected");
      if (accepted) props.boxes[column.box].solve();
    } catch {
      if (!props.signal.aborted) set(column.box, "rejected");
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <div className="native-drag-columns">
        {columns.map((column) => (
          <div key={column.box} className="native-drag-card">
            {column.image === "window" ? (
              <iframe
                title={stageText(props.locale, locale.iframeImage)}
                sandbox="allow-scripts"
                loading="lazy"
                src={
                  new URL(`drag-helper.html?locale=${props.locale}`, base).href
                }
              />
            ) : (
              <img
                className="native-drag-image"
                src={new URL(fixtures[column.image].filename, base).href}
                alt={stageText(props.locale, locale[column.alt])}
                draggable={column.image === "page"}
                onDragStart={(event) => {
                  if (column.image === "file") event.preventDefault();
                }}
                width={240}
                height={120}
              />
            )}
            <section
              className="native-drop-target"
              aria-label={stageText(props.locale, locale.dropTarget)}
              data-drop-state={states[column.box] ?? "idle"}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("text/uri-list")) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  set(column.box, "hover");
                } else {
                  event.dataTransfer.dropEffect = "none";
                  set(column.box, "rejected");
                }
              }}
              onDragLeave={() => set(column.box, "idle")}
              onDrop={(event) => void drop(event, column)}
            >
              <StageProblemGiftBox
                box={props.boxes[column.box]}
                locale={props.locale}
              />
              {(states[column.box] === "accepted" ||
                states[column.box] === "rejected") && (
                <span
                  role="status"
                  aria-label={stageText(
                    props.locale,
                    states[column.box] === "accepted"
                      ? locale.accepted
                      : locale.rejected,
                  )}
                >
                  {states[column.box] === "accepted" ? (
                    <CheckCircleOutline aria-hidden="true" />
                  ) : (
                    <ReportGmailerrorredOutlined aria-hidden="true" />
                  )}
                </span>
              )}
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B04]: {
      icon: FileUploadOutlined,
      tone: "green",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: FileDownloadOutlined,
      tone: "green",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: WindowOutlined,
      tone: "violet",
      label: locale.B06,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "DataTransfer" in window && "File" in window && crypto.subtle
        ? "available"
        : "unsupported",
    ),
  Component: S510Stage,
});
