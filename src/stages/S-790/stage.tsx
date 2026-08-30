import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
import assetManifest from "../../fixtures/s790/assets/generation-manifest.json";
import { stageText } from "../locale";
import { locale } from "./locale";

type LocalFontDataLike = {
  readonly family: string;
  readonly fullName: string;
  readonly postscriptName: string;
  readonly style: string;
  blob(): Promise<Blob>;
};

type QueryLocalFonts = (options: {
  postscriptNames: readonly string[];
}) => Promise<LocalFontDataLike[]>;

const fontAsset = new URL(
  "../../fixtures/s790/assets/busycube-key.ttf",
  import.meta.url,
).href;

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * S-790
 *
 * 目的: Git管理TTFをOS標準UIでsystem fontとしてinstallし、Local Font Accessから同じraw bytesと専用glyphを読み戻す。
 * 最初の一手: 「専用フォントを保存」でTTFをdownloadし、OS font preview/install UIでuser installしてから「OSの活字を探す」を押す。
 * 箱ごとの解法:
 * - B01「インストール書体の箱」: PostScript名`BusycubeKey-Regular`を限定queryしてfaceを厳密に一件得て、blob SHA-256がfixture manifestと一致し、そのblobのFontFaceでU+E000をload/checkできると開く。
 * 使用API: Local Font Access `queryLocalFonts()`/FontData.blob、Web Crypto SHA-256、Blob URL、CSS Font Loading APIのFontFace/Document.fonts。
 * 権限・privacy: 対象PostScript名一件だけを要求し、他のinstalled font一覧を列挙しない。font bytes/digest/nameを保存・送信せず、OS fontのuninstallは利用者に委ねる。
 * 対応環境: Local Font Accessを実装するdesktop Chromium系browserと、user fontをinstallできるOS。
 */
function S790Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const glyphRef = useRef<HTMLSpanElement>(null);
  const loadedRef = useRef<{ face: FontFace; url: string } | undefined>(
    undefined,
  );
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );

  const clear = useCallback(() => {
    const loaded = loadedRef.current;
    loadedRef.current = undefined;
    if (loaded) {
      document.fonts.delete(loaded.face);
      URL.revokeObjectURL(loaded.url);
    }
    glyphRef.current?.style.removeProperty("font-family");
  }, []);

  useEffect(() => {
    const stop = () => clear();
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      clear();
    };
  }, [clear, props.signal]);

  const scan = async () => {
    const queryLocalFonts = (
      window as Window & { queryLocalFonts?: QueryLocalFonts }
    ).queryLocalFonts;
    if (!queryLocalFonts) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    clear();
    setStatus(stageText(props.locale, locale.scanning));
    try {
      const fonts = await queryLocalFonts({
        postscriptNames: [assetManifest.postscriptName],
      });
      if (
        fonts.length !== 1 ||
        fonts[0]?.postscriptName !== assetManifest.postscriptName
      ) {
        setStatus(stageText(props.locale, locale.missing));
        return;
      }
      const blob = await fonts[0].blob();
      const bytes = await blob.arrayBuffer();
      const digest = hex(await crypto.subtle.digest("SHA-256", bytes));
      if (digest !== assetManifest.sha256) {
        setStatus(stageText(props.locale, locale.mismatch));
        return;
      }
      const url = URL.createObjectURL(blob);
      const face = new FontFace("Busycube Installed Key", `url(${url})`);
      await face.load();
      document.fonts.add(face);
      loadedRef.current = { face, url };
      if (glyphRef.current)
        glyphRef.current.style.fontFamily = '"Busycube Installed Key"';
      if (!document.fonts.check('64px "Busycube Installed Key"', "\uE000")) {
        clear();
        setStatus(stageText(props.locale, locale.mismatch));
        return;
      }
      problem.solve();
      setStatus(stageText(props.locale, locale.success));
    } catch {
      clear();
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.instruction)}</p>
      <a className="stage-action" href={fontAsset} download="busycube-key.ttf">
        {stageText(props.locale, locale.download)}
      </a>
      <figure className="s790-glyph">
        <span ref={glyphRef}></span>
        <figcaption>{stageText(props.locale, locale.glyphLabel)}</figcaption>
      </figure>
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          onClick={() => void scan()}
        >
          {stageText(props.locale, locale.scan)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => {
            clear();
            setStatus(stageText(props.locale, locale.cleared));
          }}
        >
          {stageText(props.locale, locale.clear)}
        </button>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: InstallDesktopOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "queryLocalFonts" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S790Stage,
});
