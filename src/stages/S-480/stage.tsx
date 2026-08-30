import AspectRatioOutlined from "@mui/icons-material/AspectRatioOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import PauseOutlined from "@mui/icons-material/PauseOutlined";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import SignalWifiOffOutlined from "@mui/icons-material/SignalWifiOffOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

type PreferenceKey =
  | "colorScheme"
  | "contrast"
  | "reducedMotion"
  | "reducedTransparency"
  | "reducedData";

type PreferenceObjectLike = EventTarget & {
  readonly value: string;
  readonly override: string | null;
  readonly validValues: readonly string[];
  requestOverride(value: string): Promise<void>;
  clearOverride(): void;
};

type PreferenceManagerLike = Partial<
  Readonly<Record<PreferenceKey, PreferenceObjectLike>>
>;

const preferenceDefinitions = [
  {
    key: "colorScheme",
    boxId: manifest.box.B05,
    value: "dark",
    query: "(prefers-color-scheme: dark)",
    label: "colorSchemeAction",
  },
  {
    key: "contrast",
    boxId: manifest.box.B06,
    value: "more",
    query: "(prefers-contrast: more)",
    label: "contrastAction",
  },
  {
    key: "reducedMotion",
    boxId: manifest.box.B07,
    value: "reduce",
    query: "(prefers-reduced-motion: reduce)",
    label: "motionAction",
  },
  {
    key: "reducedTransparency",
    boxId: manifest.box.B08,
    value: "reduce",
    query: "(prefers-reduced-transparency: reduce)",
    label: "transparencyAction",
  },
  {
    key: "reducedData",
    boxId: manifest.box.B09,
    value: "reduce",
    query: "(prefers-reduced-data: reduce)",
    label: "dataAction",
  },
] as const;

/**
 * S-480
 *
 * 目的: browser既定文字sizeの四つの実測帯と、User Preferences APIで明示overrideした五種類の`prefers-*`状態を個別に観測する。
 * 最初の一手: browser設定の既定font sizeを変えて上段4箱を集め、下段は各「〜にする」buttonから対応preference overrideを要求する。
 * 箱ごとの解法:
 * - B01「小さい文字の箱」: bodyへ置いた`font-size:1rem` probeのcomputed font sizeが15 px未満なら開く。
 * - B02「標準文字の箱」: 同じcomputed font sizeが15 px以上18 px未満なら開く。
 * - B03「大きい文字の箱」: 同じcomputed font sizeが18 px以上22 px未満なら開く。
 * - B04「最大文字の箱」: 同じcomputed font sizeが22 px以上なら開く。既定font sizeを変えながら4帯を訪問間で累積できる。
 * - B05「暗い配色の箱」: `colorScheme.requestOverride("dark")`成功後、objectのoverride/valueがdarkで`prefers-color-scheme: dark`もmatchすると開く。
 * - B06「高コントラストの箱」: `contrast.requestOverride("more")`成功後、報告値がmoreで`prefers-contrast: more`もmatchすると開く。
 * - B07「動きを減らす箱」: `reducedMotion.requestOverride("reduce")`成功後、報告値がreduceで`prefers-reduced-motion: reduce`もmatchすると開く。
 * - B08「透明度を減らす箱」: `reducedTransparency.requestOverride("reduce")`成功後、報告値がreduceで`prefers-reduced-transparency: reduce`もmatchすると開く。
 * - B09「通信量を減らす箱」: `reducedData.requestOverride("reduce")`成功後、報告値がreduceで`prefers-reduced-data: reduce`もmatchすると開く。
 * 使用API: `getComputedStyle()`、ResizeObserver、User Preferences APIのvalidValues/requestOverride/clearOverride、`matchMedia()`。
 * 権限・privacy: overrideは各button操作時だけ要求し、font size/preference値は現在判定にだけ使って保存・送信しない。このstageが設定したoverrideはclear操作または離脱時に解除する。
 * 対応環境: B01〜B04はcomputed styleとResizeObserver、B05〜B09は`navigator.preferences`の対応PreferenceObjectと各media featureを実装するbrowser。
 */
function S480Stage(props: Props) {
  const textProblems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
    props.boxes[manifest.box.B04],
  ] as const;
  const [solveSmall, solveStandard, solveLarge, solveExtraLarge] =
    textProblems.map((problem) => problem.solve);
  const preferenceProblems = preferenceDefinitions.map((definition) => ({
    definition,
    problem: props.boxes[definition.boxId],
  }));
  const [size, setSize] = useState(0);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.preferenceIdle),
  );
  const preferences = useMemo(
    () =>
      (navigator as Navigator & { preferences?: PreferenceManagerLike })
        .preferences,
    [],
  );

  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;font-size:1rem;line-height:1";
    probe.textContent = "M";
    document.body.append(probe);
    const inspect = () => {
      const pixels = Number.parseFloat(getComputedStyle(probe).fontSize);
      setSize(pixels);
      const band = pixels < 15 ? 0 : pixels < 18 ? 1 : pixels < 22 ? 2 : 3;
      if (band === 0) solveSmall?.();
      if (band === 1) solveStandard?.();
      if (band === 2) solveLarge?.();
      if (band === 3) solveExtraLarge?.();
    };
    inspect();
    const observer = new ResizeObserver(inspect);
    observer.observe(probe);
    return () => {
      observer.disconnect();
      probe.remove();
    };
  }, [solveExtraLarge, solveLarge, solveSmall, solveStandard]);

  useEffect(() => {
    const clear = () => {
      for (const definition of preferenceDefinitions) {
        preferences?.[definition.key]?.clearOverride();
      }
    };
    props.signal.addEventListener("abort", clear, { once: true });
    return () => {
      props.signal.removeEventListener("abort", clear);
      clear();
    };
  }, [preferences, props.signal]);

  const requestPreference = async (
    item: (typeof preferenceProblems)[number],
  ) => {
    const { definition, problem } = item;
    const preference = preferences?.[definition.key];
    if (!preference) {
      setStatus(stageText(props.locale, locale.preferenceUnavailable));
      return;
    }
    if (!preference.validValues.includes(definition.value)) {
      setStatus(stageText(props.locale, locale.preferenceInvalid));
      return;
    }
    try {
      await preference.requestOverride(definition.value);
      const effective = window.matchMedia(definition.query).matches;
      const reported =
        preference.override === definition.value ||
        preference.value === definition.value;
      if (effective && reported) {
        problem.solve();
        setStatus(stageText(props.locale, locale.preferenceApplied));
      } else {
        setStatus(stageText(props.locale, locale.preferenceNotEffective));
      }
    } catch {
      setStatus(stageText(props.locale, locale.preferenceRejected));
    }
  };

  const clearPreferences = () => {
    for (const definition of preferenceDefinitions) {
      preferences?.[definition.key]?.clearOverride();
    }
    setStatus(stageText(props.locale, locale.preferenceCleared));
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {textProblems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <p className="measurement">{size.toFixed(1)}px</p>
      <div className="problem-row">
        {preferenceProblems.map(({ problem }) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <div className="stage-action-row">
        {preferenceProblems.map((item) => (
          <button
            key={item.problem.id}
            type="button"
            className="stage-action"
            disabled={!preferences?.[item.definition.key]}
            onClick={() => void requestPreference(item)}
          >
            {stageText(props.locale, locale[item.definition.label])}
          </button>
        ))}
        <button
          type="button"
          className="stage-action"
          onClick={clearPreferences}
        >
          {stageText(props.locale, locale.clearPreferences)}
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
      icon: AspectRatioOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: AspectRatioOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: AspectRatioOutlined,
      color: "#fbbf24",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: AspectRatioOutlined,
      color: "#fb7185",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: LightModeOutlined,
      color: "#312e81",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: SelectAllOutlined,
      color: "#f8fafc",
      label: locale.B06,
    },
    [manifest.box.B07]: {
      icon: PauseOutlined,
      color: "#22c55e",
      label: locale.B07,
    },
    [manifest.box.B08]: {
      icon: VisibilityOffOutlined,
      color: "#94a3b8",
      label: locale.B08,
    },
    [manifest.box.B09]: {
      icon: SignalWifiOffOutlined,
      color: "#38bdf8",
      label: locale.B09,
    },
  },
  probe: () => "available",
  Component: S480Stage,
});
