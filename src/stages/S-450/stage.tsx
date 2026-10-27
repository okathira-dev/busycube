import "./styles.css";
import AppsOutlined from "@mui/icons-material/AppsOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  appDisplay,
  type Entrance,
  gameUri,
  handlerTemplate,
  pendingKeys,
  receipt,
} from "./protocol";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-450
 * 目的: インストール済みPWAのmanifestとbrowserのregisterProtocolHandlerという異なる受け口へ、二種類のゲームURIを実際に渡す。
 * 最初の一手: アプリアイコン側の箱を押すか、登録の影響説明を読んでbrowser側の鎖の箱を押す。
 * 箱ごとの解法:
 * - B01「枠から出る矢印」: 箱から作るweb+busycube:openのURIをPWAのmanifest.protocol_handlers経由で開く。同じoriginのS-450/entry appへ届く初期URLまたは実LaunchQueue.targetURLのURIを一回decodeして今回の保存UUIDと照合し、実display-modeがstandalone/minimal-ui/window-controls-overlayなら開く。通常tabの同じURLをPWA起動へ読み替えない。未登録を時間経過/blurで判断せず、明示的なアプリ入口アイコンを残す。
 * - B02「鎖の輪」: 箱からnavigator.registerProtocolHandlerでwtaiの受け口を登録し、表示したゲーム用wtai:busycube URIをbrowserに渡す。同じoriginのS-450/entry browserへ実際に届いた初期URLまたはLaunchQueue URLが最新の保存UUIDと一致すると開く。登録呼出しの成功や許可UI表示だけでは開かない。実電話番号・WAP通話/電話帳commandは使わない。
 * 使用API: manifest.protocol_handlers、navigator.registerProtocolHandler/unregisterProtocolHandler、LaunchQueue、URL、matchMedia display-mode、crypto.randomUUID、localStorage。
 * 権限・privacy: wtaiの登録は箱の明示操作だけで行い、既存の関連付けへ影響する可能性と解除方法を表示する。URIと一時保存は試行UUIDのみで外部app情報を扱わず、受領で試行を消す。PWAのweb+busycubeをbrowserのregisterProtocolHandlerで代用登録しない。
 * 対応環境: PWA protocol handlerまたはbrowserのwtai登録が可能な環境。各schemeの許可/既定app/UIはOS/browser依存で、実URI受領前には達成としない。
 */
function S450Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const solved = useRef(new Set<Entrance>());
  const [links, setLinks] = useState<Partial<Record<Entrance, string>>>({});
  const [status, setStatus] = useState("waiting");
  useEffect(() => {
    let active = true;
    const inspect = (target: string) => {
      if (!active || props.signal.aborted) return;
      const value = receipt(target, location.origin);
      if (
        !value ||
        solved.current.has(value.entrance) ||
        (value.entrance === "app" && !appDisplay())
      )
        return;
      try {
        if (localStorage.getItem(pendingKeys[value.entrance]) !== value.round) {
          setStatus("invalid");
          return;
        }
        localStorage.removeItem(pendingKeys[value.entrance]);
        solved.current.add(value.entrance);
        boxes.current[value.entrance === "app" ? "B01" : "B02"].solve();
        setStatus("launched");
        const current = receipt(location.href, location.origin);
        if (
          current?.round === value.round &&
          current.entrance === value.entrance
        ) {
          const clean = new URL(location.href);
          clean.searchParams.delete("protocol");
          clean.searchParams.delete("entry");
          history.replaceState(history.state, "", clean);
        }
      } catch {
        setStatus("error");
      }
    };
    inspect(location.href);
    const queue = window.launchQueue;
    queue?.setConsumer((params) => {
      if (params.files.length === 0) inspect(params.targetURL);
    });
    const release = () => {
      if (active) {
        active = false;
        queue?.setConsumer(() => {});
      }
    };
    props.signal.addEventListener("abort", release, { once: true });
    if (props.signal.aborted) release();
    return () => {
      release();
      props.signal.removeEventListener("abort", release);
    };
  }, [props.signal]);
  const begin = (entrance: Entrance) => {
    if (props.signal.aborted || solved.current.has(entrance)) return;
    try {
      if (entrance === "browser") {
        if (typeof navigator.registerProtocolHandler !== "function") {
          setStatus("unavailable");
          return;
        }
        navigator.registerProtocolHandler(
          "wtai",
          handlerTemplate(location.origin),
        );
      }
      const round = crypto.randomUUID();
      localStorage.setItem(pendingKeys[entrance], round);
      const uri = gameUri(entrance, round);
      setLinks((current) => ({ ...current, [entrance]: uri }));
      setStatus("waiting");
      if (entrance === "app") {
        const link = document.createElement("a");
        link.href = uri;
        document.body.append(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      }
    } catch (error) {
      setStatus(
        error instanceof DOMException && error.name === "SecurityError"
          ? "denied"
          : "error",
      );
    }
  };
  const unregister = () => {
    if (props.signal.aborted) return;
    try {
      const nav = navigator as Navigator & {
        unregisterProtocolHandler?: (scheme: string, url: string) => void;
      };
      if (!nav.unregisterProtocolHandler) {
        setStatus("unavailable");
        return;
      }
      nav.unregisterProtocolHandler("wtai", handlerTemplate(location.origin));
      localStorage.removeItem(pendingKeys.browser);
      setLinks((current) => ({ ...current, browser: undefined }));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };
  return (
    <div className="puzzle puzzle--centered s450-puzzle">
      <p className="s450-note">{stageText(props.locale, locale.impact)}</p>
      <div className="s450-entrances">
        <div className="s450-entrance">
          <img src="/icon.svg" alt="" width={56} height={56} />
          <StageProblemGiftBox
            box={props.boxes.B01}
            locale={props.locale}
            onClick={() => begin("app")}
          />
          {links.app ? (
            <a className="s450-uri" href={links.app}>
              web+busycube:
            </a>
          ) : (
            <span className="s450-uri">web+busycube:</span>
          )}
        </div>
        <div className="s450-entrance">
          <DesktopWindowsOutlined className="s450-browser" aria-hidden="true" />
          <StageProblemGiftBox
            box={props.boxes.B02}
            locale={props.locale}
            onClick={() => begin("browser")}
          />
          {links.browser ? (
            <a className="s450-uri" href={links.browser}>
              wtai:
            </a>
          ) : (
            <span className="s450-uri">wtai:</span>
          )}
        </div>
      </div>
      <p role="status">{statusText(props.locale, status)}</p>
      <a
        href="/?stage=S-080"
        className="s450-install"
        aria-label={stageText(props.locale, locale.install)}
      >
        <AppsOutlined aria-hidden="true" />
      </a>
      <p className="s450-note">{stageText(props.locale, locale.cleanup)}</p>
      <button
        type="button"
        className="stage-action"
        onClick={unregister}
        aria-label={stageText(props.locale, locale.unregister)}
      >
        <LinkOffOutlined aria-hidden="true" />
      </button>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: OpenInNewOutlined, color: "#60a5fa", label: locale.B01 },
    B02: { icon: LinkOutlined, color: "#a78bfa", label: locale.B02 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "launchQueue" in window || "registerProtocolHandler" in navigator
        ? "available"
        : "unsupported",
    ),
  Component: S450Stage,
});
