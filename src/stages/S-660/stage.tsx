import "./styles.css";
import MemoryOutlined from "@mui/icons-material/MemoryOutlined";
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

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const levels = [1, 2, 3, 4] as const;
function Indicator({ level }: { level: number }) {
  return (
    <div className="pressure-bars" aria-hidden="true">
      {levels.map((step) => (
        <span key={step} data-lit={step <= level} />
      ))}
    </div>
  );
}

/**
 * S-660
 *
 * 目的: ブラウザーが公開する実CPU pressureをnominal、fair、serious/criticalの三帯で観測する。
 * 最初の一手: チップの四段階メーターを観察し、端末で通常作業を行い状態の変化を待つ。
 * 箱ごとの解法:
 * - B01「チップ」: 低負荷の端末で初回の自動観測を待つ。最新の実PressureRecord.stateがnominalなら開く。
 * - B04「チップ」: 通常作業中の状態変化を待つ。最新stateが厳密にfairなら開く。seriousではこの箱を開かない。
 * - B03「チップ」: 通常作業中の状態変化を待つ。最新stateがseriousまたはcriticalなら開く。critical単独は必須にせず、訪問間で累積できる。
 * 使用API: PressureObserver.knownSources、cpu sourceのobserve、PressureRecord、Page Visibility。
 * 権限・privacy: ゲーム自身は負荷を発生させない。coarseな四状態だけを表示・判定し、CPU使用率・process・状態履歴を取得/保存/送信しない。
 * 対応環境: CPU sourceのCompute Pressure APIと必要なPermissions Policyを満たすブラウザー。hidden中は切断し、visibleで再購読する。
 */
function S660Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let observer: PressureObserver | null = null;
    const solved = new Set<string>();
    const stop = () => {
      observer?.disconnect();
      observer = null;
    };
    const observe = async () => {
      if (!active || props.signal.aborted || observer || document.hidden)
        return;
      const Constructor = window.PressureObserver;
      if (!Constructor?.knownSources.includes("cpu")) {
        setError(true);
        return;
      }
      const instance = new Constructor((records) => {
        if (
          !active ||
          props.signal.aborted ||
          observer !== instance ||
          document.hidden
        )
          return;
        const state = records.at(-1)?.state;
        const ordinal =
          state === "nominal"
            ? 1
            : state === "fair"
              ? 2
              : state === "serious"
                ? 3
                : state === "critical"
                  ? 4
                  : 0;
        if (!ordinal) return;
        setLevel(ordinal);
        setError(false);
        const box = ordinal === 1 ? "B01" : ordinal === 2 ? "B04" : "B03";
        if (!solved.has(box)) {
          solved.add(box);
          boxes.current[box].solve();
        }
      });
      observer = instance;
      try {
        await instance.observe("cpu", { sampleInterval: 1000 });
      } catch {
        if (active && observer === instance && !props.signal.aborted) {
          stop();
          setError(true);
        }
      }
    };
    const visibility = () => {
      if (document.hidden) stop();
      else void observe();
    };
    const dispose = () => {
      active = false;
      stop();
    };
    document.addEventListener("visibilitychange", visibility);
    props.signal.addEventListener("abort", dispose, { once: true });
    void observe();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="pressure-reading">
        <MemoryOutlined aria-hidden="true" />
        <Indicator level={level} />
        <meter
          className="sr-only"
          aria-label={stageText(props.locale, locale.level)}
          min={0}
          max={4}
          value={level}
        >
          {level}
        </meter>
      </div>
      <div className="problem-row">
        <div className="pressure-target">
          <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
          <Indicator level={1} />
        </div>
        <div className="pressure-target">
          <StageProblemGiftBox box={props.boxes.B04} locale={props.locale} />
          <Indicator level={2} />
        </div>
        <div className="pressure-target">
          <StageProblemGiftBox box={props.boxes.B03} locale={props.locale} />
          <div className="pressure-alternatives">
            <Indicator level={3} />
            <span aria-hidden="true">/</span>
            <Indicator level={4} />
          </div>
        </div>
      </div>
      {error && (
        <p role="status">{stageText(props.locale, locale.unavailable)}</p>
      )}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: MemoryOutlined,
      tone: "cyan",
      label: locale.box,
    },
    [manifest.box.B04]: {
      icon: MemoryOutlined,
      tone: "amber",
      label: locale.box,
    },
    [manifest.box.B03]: {
      icon: MemoryOutlined,
      tone: "rose",
      label: locale.box,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      window.PressureObserver?.knownSources.includes("cpu")
        ? "available"
        : "unsupported",
    ),
  Component: S660Stage,
});
