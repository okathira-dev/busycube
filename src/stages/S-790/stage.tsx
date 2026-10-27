import "./styles.css";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import asset from "../../fixtures/s790/assets/font-contract.json";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type LocalFont = { postscriptName: string; blob(): Promise<Blob> };
type QueryFonts = (options: {
  postscriptNames: string[];
}) => Promise<LocalFont[]>;
const download = new URL(
  "../../fixtures/s790/assets/busycube-key.ttf?no-inline",
  import.meta.url,
).href;
/**
 * S-790
 * 目的: OSへ導入した専用fontを読み戻し、その字形で読める合言葉を回答する。
 * 最初の一手: file iconから専用TTFを保存し、箱からOSにある専用活字を照会する。
 * 箱ごとの解法:
 * - B02「画面と下向き矢印」: 配布fontをOSへinstallし箱を押す。PostScript名BusycubeKeyTwo-Regularの一件だけをqueryし、実blobのSHA-256が契約と一致し、同blob由来FontFaceのload/check後、表示された四字CUBEを入力すると開く。取得だけでは開かない。
 * 使用API: Local Font Access queryLocalFonts/FontData.blob、Web Crypto SHA-256、FontFace/Document.fonts。
 * 権限・privacy: 専用PostScript名だけを照会し、全font列挙・font/名前の保存/送信はしない。離脱はページ内faceだけを解放し、OS側のfontは利用者が削除する。
 * 対応環境: Local Font AccessとOSへのuser font導入が可能なdesktop Chromium。旧B01は取得だけの履歴として保持し、新回答箱へ自動移行しない。
 */
function S790Stage(props: Props) {
  const problem = props.boxes.B02;
  const visit = useRef({ generation: 0, alive: false });
  const loaded = useRef<{ face: FontFace } | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const [answer, setAnswer] = useState("");
  const clear = useCallback(() => {
    const old = loaded.current;
    loaded.current = null;
    if (old) {
      document.fonts.delete(old.face);
    }
  }, []);
  useEffect(() => {
    const current = visit.current;
    current.alive = true;
    const stop = () => {
      current.alive = false;
      current.generation++;
      clear();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    return () => {
      stop();
      props.signal.removeEventListener("abort", stop);
    };
  }, [props.signal, clear]);
  const scan = async () => {
    const current = visit.current;
    if (!current.alive || props.signal.aborted) return;
    const generation = ++current.generation;
    const valid = () =>
      current.alive &&
      !props.signal.aborted &&
      current.generation === generation;
    clear();
    setReady(false);
    setStatus("waiting");
    const query = (window as Window & { queryLocalFonts?: QueryFonts })
      .queryLocalFonts;
    if (!query) {
      setStatus("unavailable");
      return;
    }
    let pending: { face: FontFace } | null = null;
    try {
      const fonts = await query({ postscriptNames: [asset.postscriptName] });
      if (!valid()) return;
      if (
        fonts.length !== 1 ||
        fonts[0]?.postscriptName !== asset.postscriptName
      ) {
        setStatus("missing");
        return;
      }
      const blob = await fonts[0].blob();
      if (!valid()) return;
      const bytes = await blob.arrayBuffer();
      const digest = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (!valid()) return;
      if (digest !== asset.sha256) {
        setStatus("invalid");
        return;
      }
      // font-src excludes blob URLs. Use only verified OS-returned bytes without
      // adding a network/asset fallback or widening the policy.
      const face = new FontFace("Busycube Installed Phrase", bytes);
      pending = { face };
      await face.load();
      if (!valid()) return;
      document.fonts.add(face);
      if (!document.fonts.check('64px "Busycube Installed Phrase"', asset.text))
        throw new Error("Invalid font");
      loaded.current = pending;
      pending = null;
      setReady(true);
      setStatus("read");
    } catch {
      if (valid()) setStatus("unavailable");
    } finally {
      if (pending) {
        document.fonts.delete(pending.face);
      }
    }
  };
  return (
    <div className="puzzle puzzle--centered s790-puzzle">
      <a
        className="stage-action"
        href={download}
        download="busycube-key.ttf"
        aria-label={stageText(props.locale, locale.download)}
      >
        <InsertDriveFileOutlined aria-hidden="true" />
      </a>
      <div
        role="img"
        className={`s790-glyph${ready ? " s790-glyph--ready" : ""}`}
        aria-label={stageText(props.locale, locale.glyphLabel)}
      >
        {asset.text}
      </div>
      <div className="problem-row">
        <StageProblemGiftBox
          box={problem}
          locale={props.locale}
          onClick={() => void scan()}
        />
      </div>
      <label className="parallel-answer">
        {stageText(props.locale, locale.answer)}
        <input
          value={answer}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setAnswer(value);
            if (
              ready &&
              loaded.current &&
              visit.current.alive &&
              !props.signal.aborted &&
              value.trim().toUpperCase() === asset.answer
            ) {
              problem.solve();
              setStatus("success");
            }
          }}
        />
      </label>
      <p role="status" className="interaction-status">
        {status === "missing"
          ? stageText(props.locale, locale.missing)
          : statusText(props.locale, status)}
      </p>
      <small>{stageText(props.locale, locale.cleanup)}</small>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B02: { icon: InstallDesktopOutlined, color: "#c084fc", label: locale.B02 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "queryLocalFonts" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S790Stage,
});
