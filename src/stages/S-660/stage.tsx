import MemoryOutlined from "@mui/icons-material/MemoryOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

function boxIndexFor(state: PressureState) {
  if (state === "nominal") return 0;
  if (state === "critical") return 2;
  return 1;
}

/**
 * S-660
 *
 * 目的: browserがprivacy保護済みhintとして公開するCPU pressureを、nominal・中間・criticalの三帯で観測する。
 * 最初の一手: stageをvisibleのまま1秒間隔の自動観測を待つ。別app等の通常作業負荷を変えて異なるpressure stateを作る。
 * 箱ごとの解法:
 * - B01「nominalの箱」: CPU sourceの最新PressureRecord `state`が厳密に`nominal`なら開く。
 * - B02「中間負荷の箱」: 最新stateが`fair`または`serious`のどちらかなら開く。
 * - B03「criticalの箱」: 最新stateが厳密に`critical`なら開く。訪問をまたいだ三状態は通常進捗へ累積できる。
 * 使用API: Compute Pressure APIの`PressureObserver.knownSources`、CPU `observe()`、PressureRecord state、Page Visibility API。
 * 権限・privacy: Busycube自身は意図的なCPU負荷を生成せず、coarse stateだけを表示・判定する。利用率・process・状態履歴を保存・送信しない。
 * 対応環境: CPU sourceのCompute Pressure APIを公開し、必要なPermissions Policyを満たすbrowser。hidden中は観測せずvisible復帰時に再購読する。
 */
function S660Stage(props: Props) {
  const problems = [props.boxes.B01, props.boxes.B02, props.boxes.B03] as const;
  const observer = useRef<PressureObserver | null>(null);
  const [state, setState] = useState<PressureState | "waiting">("waiting");
  const [status, setStatus] = useState("");

  const stop = useCallback(() => {
    observer.current?.disconnect();
    observer.current = null;
  }, []);

  useEffect(() => {
    let disposed = false;
    const observe = async () => {
      if (disposed || observer.current || document.visibilityState === "hidden")
        return;
      const Constructor = window.PressureObserver;
      if (!Constructor?.knownSources.includes("cpu")) {
        setStatus(stageText(props.locale, locale.unavailable));
        return;
      }
      const instance = new Constructor((records) => {
        const latest = records.at(-1)?.state;
        if (!latest) return;
        setState(latest);
        problems[boxIndexFor(latest)]?.solve();
        setStatus(`${stageText(props.locale, locale.cpuPrefix)}=${latest}`);
      });
      observer.current = instance;
      setStatus(stageText(props.locale, locale.observing));
      try {
        await instance.observe("cpu", { sampleInterval: 1_000 });
      } catch {
        if (observer.current === instance) stop();
        setStatus(stageText(props.locale, locale.observeFailed));
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }
      void observe();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    void observe();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      observer.current?.disconnect();
      observer.current = null;
    };
  }, [problems, props.locale, stop]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <p className="measurement">{state}</p>
      <p className="interaction-status" role="status">
        {status || stageText(props.locale, locale.idle)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: MemoryOutlined,
      color: "#a7f3d0",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: MemoryOutlined,
      color: "#6ee7b7",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: MemoryOutlined,
      color: "#10b981",
      label: locale.B03,
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
