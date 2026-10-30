import "./styles.css";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import DesktopAccessDisabledOutlined from "@mui/icons-material/DesktopAccessDisabledOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import YardOutlined from "@mui/icons-material/YardOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import {
  type GreenhouseView,
  greenhouse,
  greenhouseRequest,
  periodicUrl,
  S740_TAG,
} from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-740
 * 目的: 全同origin windowが閉じている間の実Periodic Background Sync一回で開花画像を保存し、再訪して発見する。
 * 最初の一手: 芽の鉢の箱を押し、閉じた画面から温室へ続く図を見る。
 * 箱ごとの解法:
 * - B02「芽の出た鉢」: 箱で専用tagを登録し、同originの全windowを閉じてbrowserの実schedulerを待つ。trusted periodicsyncが窓0件とarmed試行を確認し、実開花SVGの取得/Cache保存/IDBの同試行完了を終えた後、再訪時の自動読込でその画像と完了が両方揃えば開く。水/光の二回待ちや時間経過で代用しない。実行時刻は保証せず、登録間隔の下限希望は24時間とする。別の植え直し操作は植物だけを新試行へ戻し、共通クリア済み箱/記録を消さない。
 * 使用API: 専用scopeのService Worker、Periodic Background Sync、Clients matchAll includeUncontrolled、IndexedDB、Cache Storage、MessageChannel、実画像Blob URL。
 * 権限・privacy: 保存は一時試行UUIDと植物のphase/開花画像のみ。古い二段階のcare storeと進捗は保持し、新条件へ達成をコピーしない。開花保存後にこのstageのtagだけを自動unregisterし、失敗時は再訪/復帰で再試行する。SW全体や他のtagは解除しない。
 * 対応環境: 長期の背景同期を許可し、全窓を閉じても実periodicsyncを起動できるbrowser/OS。schedulerやinstall/許可の条件はbrowser依存で、拒否/不在/未観測を開花へ変換しない。
 */
function S740Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const api = useRef<ReturnType<typeof greenhouse> | null>(null);
  const sequence = useRef(0);
  const solved = useRef(false);
  const [view, setView] = useState<GreenhouseView | null>(null);
  const [image, setImage] = useState<string>();
  const [status, setStatus] = useState("waiting");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const connect = useCallback(() => {
    if (!api.current)
      api.current = greenhouse(props.signal).catch((error) => {
        api.current = null;
        throw error;
      });
    return api.current;
  }, [props.signal]);
  const accept = useCallback((next: GreenhouseView) => {
    setView(next);
    if (next.phase === "bloom" && next.image) {
      setImage(URL.createObjectURL(next.image));
      setStatus("success");
      if (!solved.current) {
        solved.current = true;
        boxes.current.B02.solve();
      }
    } else {
      setImage(undefined);
      setStatus(
        next.phase === "bloom"
          ? "error"
          : next.phase === "armed"
            ? "waiting"
            : "idle",
      );
    }
  }, []);
  const inspect = useCallback(async () => {
    if (props.signal.aborted || locked.current) return;
    const token = ++sequence.current;
    try {
      const { worker } = await connect();
      const next = await greenhouseRequest(worker, "read", props.signal);
      if (!props.signal.aborted && token === sequence.current) accept(next);
    } catch {
      if (!props.signal.aborted && token === sequence.current)
        setStatus("error");
    }
  }, [props.signal, connect, accept]);
  useEffect(() => {
    void inspect();
    const focus = () => {
      if (document.visibilityState === "visible") void inspect();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      sequence.current++;
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [inspect]);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  const plant = async (replant: boolean) => {
    if (
      props.signal.aborted ||
      locked.current ||
      (!replant && view?.phase === "bloom")
    )
      return;
    locked.current = true;
    setBusy(true);
    const token = ++sequence.current;
    try {
      const { registration, worker } = await connect();
      if (props.signal.aborted || token !== sequence.current) return;
      if (!registration.periodicSync) {
        setStatus("unavailable");
        return;
      }
      const nonce = crypto.randomUUID();
      const prepared = await greenhouseRequest(
        worker,
        "prepare",
        props.signal,
        nonce,
      );
      if (props.signal.aborted || token !== sequence.current) return;
      accept(prepared);
      setStatus("waiting");
      await registration.periodicSync.register(S740_TAG, {
        minInterval: 24 * 60 * 60 * 1000,
      });
      if (props.signal.aborted || token !== sequence.current) return;
      const armed = await greenhouseRequest(worker, "arm", props.signal, nonce);
      if (!props.signal.aborted && token === sequence.current) accept(armed);
    } catch (error) {
      if (!props.signal.aborted && token === sequence.current)
        setStatus(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "denied"
            : "error",
        );
    } finally {
      locked.current = false;
      if (!props.signal.aborted && token === sequence.current) setBusy(false);
    }
  };
  return (
    <div className="puzzle puzzle--centered s740-puzzle">
      <StageProblemGiftBox
        box={props.boxes.B02}
        locale={props.locale}
        onClick={() => void plant(false)}
      />
      <div className="s740-away" aria-hidden="true">
        <DesktopAccessDisabledOutlined />
        <ArrowForwardOutlined />
        <SpaOutlined />
      </div>
      <img
        className="s740-plant"
        src={image ?? periodicUrl("seed.svg")}
        alt={stageText(props.locale, locale.imageAlt)}
        width={480}
        height={320}
      />
      <p role="status" className="interaction-status">
        {view?.cleanupPending
          ? stageText(props.locale, locale.cleanup)
          : statusText(props.locale, status)}
      </p>
      <button
        type="button"
        className="stage-action"
        disabled={busy}
        onClick={() => void plant(true)}
        aria-label={stageText(props.locale, locale.replant)}
      >
        <YardOutlined aria-hidden="true" />
      </button>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: { B02: { icon: SpaOutlined, color: "#86efac", label: locale.B02 } },
  probe: () =>
    safeCapabilityProbe(() =>
      "serviceWorker" in navigator &&
      "caches" in window &&
      "indexedDB" in window
        ? "available"
        : "unsupported",
    ),
  Component: S740Stage,
});
