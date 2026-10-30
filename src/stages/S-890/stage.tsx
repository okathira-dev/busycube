import "./styles.css";
import FullscreenExitOutlined from "@mui/icons-material/FullscreenExitOutlined";
import FullscreenOutlined from "@mui/icons-material/FullscreenOutlined";
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

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-890
 * 目的: 静止画のような小さいviewerが要素Fullscreenで動き、触れられる箱へ変わる。
 * 最初の一手: viewer右下の全画面iconを押す。
 * 箱ごとの解法:
 * - B01「外向きの四隅」: viewerそのものを実Fullscreenにし、その中で動く箱を押す。trusted click時にもdocument.fullscreenElementが今回の額縁そのものなら開く。通常表示/別要素のFullscreenでは開かない。
 * 使用API: Element.requestFullscreen、Document.fullscreenElement/fullscreenchange/exitFullscreen、CSS :fullscreen。
 * 権限・privacy: 明示操作で要素を全画面化し、画面capture・記録・保存・送信はしない。
 * 対応環境: 任意HTML要素のFullscreenに対応するbrowser。PiPサイズ合わせとは独立した同じ一箱/進捗を維持する。
 */
function S890Stage(props: Props) {
  const problem = props.boxes.B01;
  const frame = useRef<HTMLDivElement>(null);
  const alive = useRef(false);
  const pending = useRef(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    alive.current = true;
    const element = frame.current;
    const update = () => {
      if (alive.current) setActive(document.fullscreenElement === element);
    };
    const stop = () => {
      alive.current = false;
      if (element && document.fullscreenElement === element)
        void document.exitFullscreen().catch(() => {});
    };
    document.addEventListener("fullscreenchange", update);
    update();
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    return () => {
      document.removeEventListener("fullscreenchange", update);
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  const toggle = async () => {
    const element = frame.current;
    if (!element || !alive.current || props.signal.aborted || pending.current)
      return;
    pending.current = true;
    setStatus("");
    try {
      if (document.fullscreenElement === element)
        await document.exitFullscreen();
      else await element.requestFullscreen();
      if (
        (!alive.current || props.signal.aborted) &&
        document.fullscreenElement === element
      )
        await document.exitFullscreen();
    } catch {
      if (alive.current && !props.signal.aborted) setStatus("unavailable");
    } finally {
      pending.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered s890-stage">
      <div
        ref={frame}
        className="s890-frame"
        data-fullscreen={active ? "true" : "false"}
      >
        <div className="s890-frame__header">
          <span aria-hidden="true">◧</span>
          <span>busycube</span>
        </div>
        <div className="s890-frame__content">
          <div className="s890-live">
            <StageProblemGiftBox
              box={problem}
              locale={props.locale}
              onClick={
                active
                  ? (event) => {
                      if (
                        alive.current &&
                        !props.signal.aborted &&
                        event.isTrusted &&
                        document.fullscreenElement === frame.current
                      )
                        problem.solve();
                    }
                  : undefined
              }
            />
          </div>
        </div>
        <div className="s890-toolbar">
          <button
            className="stage-action"
            type="button"
            aria-label={stageText(
              props.locale,
              active ? locale.exit : locale.fullscreen,
            )}
            onClick={() => void toggle()}
          >
            {active ? (
              <FullscreenExitOutlined aria-hidden="true" />
            ) : (
              <FullscreenOutlined aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {status ? (
        <p className="interaction-status" role="status">
          {statusText(props.locale, status)}
        </p>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: FullscreenOutlined, color: "#0ea5e9", label: locale.B01 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "requestFullscreen" in Element.prototype ? "available" : "unsupported",
    ),
  Component: S890Stage,
});
