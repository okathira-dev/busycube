import "./styles.css";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  compressionFormats,
  createParcels,
  type ParcelFormat,
  UnsupportedCompressionError,
} from "./parcels";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type ReadyRound = {
  formats: readonly ParcelFormat[];
  files: readonly { name: string; url: string }[];
};
type Status = "preparing" | "ready" | "unsupported" | "failed";
const formatNames = {
  gzip: "gzip",
  deflate: "zlib (DEFLATE)",
  "deflate-raw": "raw DEFLATE",
};

/**
 * S-880
 *
 * 目的: 外部で三ファイルの圧縮形式を調べ、一括回答で一箱を開ける。
 * 最初の一手: 紙と下向き矢印の箱を押し、三つの.compressedファイルを取得して調べる。
 * 箱ごとの解法:
 * - B04「紙と下向き矢印」: 三ファイルをダウンロードし、各ファイルの実形式をgzip / zlib (DEFLATE) / raw DEFLATEから選び確定する。実CompressionStream生成とDecompressionStream完全往復検証が成功した同じ世代の三割当すべてに一致すると開く。途中選択では判定しない。誤答では割当と本文を更新して未選択へ戻す。
 * 使用API: CompressionStream/DecompressionStream三形式、ReadableStream、crypto.getRandomValues、Blob URL、native download。
 * 権限・privacy: 権限不要。無作為な問題本文/byte列/回答を訪問中memoryだけで扱い、外部送信や端末入力の取得はしない。プレイヤーが明示操作で問題ファイルを保存する。
 * 対応環境: 三形式すべてを圧縮/展開できるbrowser。複数ダウンロードが制限される場合も、同じ世代の各ファイルを個別リンクから再取得できる。拡張子は圧縮形式を示さない。
 */
function S880Stage(props: Props) {
  const [generation, setGeneration] = useState(1);
  const [round, setRound] = useState<ReadyRound | null>(null);
  const [status, setStatus] = useState<Status>("preparing");
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [retried, setRetried] = useState(false);
  const previous = useRef<readonly ParcelFormat[] | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    const stop = () => {
      controller.abort();
      for (const url of urls.splice(0)) URL.revokeObjectURL(url);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) controller.abort();
    setRound(null);
    setStatus("preparing");
    void createParcels(controller.signal, previous.current)
      .then((created) => {
        if (controller.signal.aborted) return;
        const files = created.parcels.map((blob, index) => {
          const url = URL.createObjectURL(blob);
          urls.push(url);
          return {
            name: `parcel-${generation}-${["a", "b", "c"][index]}.compressed`,
            url,
          };
        });
        previous.current = created.formats;
        setRound({ formats: created.formats, files });
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        for (const url of urls.splice(0)) URL.revokeObjectURL(url);
        setStatus(
          error instanceof UnsupportedCompressionError
            ? "unsupported"
            : "failed",
        );
      });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [generation, props.signal]);
  const downloadAll = () => {
    if (!round || props.signal.aborted) return;
    for (const file of round.files) {
      const anchor = document.createElement("a");
      anchor.href = file.url;
      anchor.download = file.name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    }
  };
  const submit = () => {
    if (!round || props.signal.aborted || answers.some((answer) => !answer))
      return;
    if (round.formats.every((format, index) => answers[index] === format)) {
      props.boxes[manifest.box.B04].solve();
    } else {
      setRound(null);
      setAnswers(["", "", ""]);
      setRetried(true);
      setGeneration((current) => current + 1);
    }
  };
  return (
    <div className="puzzle s880-stage">
      <StageProblemGiftBox
        box={props.boxes[manifest.box.B04]}
        locale={props.locale}
        onClick={round ? downloadAll : undefined}
      />
      {round ? (
        <form
          className="s880-answer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="s880-parcels">
            {round.files.map((file, index) => (
              <section className="s880-parcel" key={file.name}>
                <a href={file.url} download={file.name}>
                  {file.name}
                </a>
                <select
                  aria-label={file.name}
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) =>
                      current.map((answer, i) =>
                        i === index ? event.target.value : answer,
                      ),
                    )
                  }
                >
                  <option value="">—</option>
                  {compressionFormats.map((format) => (
                    <option key={format} value={format}>
                      {formatNames[format]}
                    </option>
                  ))}
                </select>
              </section>
            ))}
          </div>
          <button
            type="submit"
            className="stage-action"
            aria-label={stageText(props.locale, locale.confirm)}
            disabled={answers.some((answer) => !answer)}
          >
            <CheckOutlined />
          </button>
        </form>
      ) : (
        <p role="status">
          {stageText(
            props.locale,
            locale[status === "ready" ? "preparing" : status],
          )}
        </p>
      )}
      {retried ? (
        <output aria-label={stageText(props.locale, locale.newQuestion)}>
          ↻
        </output>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B04]: {
      icon: FileDownloadOutlined,
      color: "#c084fc",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "CompressionStream" in window && "DecompressionStream" in window
        ? "available"
        : "unsupported",
    ),
  Component: S880Stage,
});
