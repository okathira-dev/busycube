import "./styles.css";
import BlurOnOutlined from "@mui/icons-material/BlurOnOutlined";
import ContrastOutlined from "@mui/icons-material/ContrastOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import GrainOutlined from "@mui/icons-material/GrainOutlined";
import InvertColorsOutlined from "@mui/icons-material/InvertColorsOutlined";
import MotionPhotosOffOutlined from "@mui/icons-material/MotionPhotosOffOutlined";
import OpacityOutlined from "@mui/icons-material/OpacityOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import StayCurrentLandscapeOutlined from "@mui/icons-material/StayCurrentLandscapeOutlined";
import StayCurrentPortraitOutlined from "@mui/icons-material/StayCurrentPortraitOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
export const mediaRequirements = [
  { box: "B01", query: "(prefers-color-scheme: dark)" },
  { box: "B02", query: "(prefers-contrast: more)" },
  { box: "B03", query: "(prefers-reduced-motion: reduce)" },
  { box: "B04", query: "(prefers-reduced-transparency: reduce)" },
  { box: "B05", query: "(forced-colors: active)" },
  { box: "B06", query: "(orientation: portrait)" },
  { box: "B07", query: "(orientation: landscape)" },
  { box: "B08", query: "(resolution < 1dppx)" },
  { box: "B09", query: "(resolution > 1dppx)" },
] as const;

/**
 * S-930
 *
 * 目的: ページに公開された表示設定・縦横・画素密度と、印刷準備の実観測を集める。
 * 最初の一手: 現在の設定で開いた箱と中央の図を見て、表示設定や画面の縦横を変える。
 * 箱ごとの解法:
 * - B01「月」: ブラウザーやOSで暗色設定を有効にする。実matchMediaのprefers-color-scheme:darkが初期状態またはchangeで一致すると開く。
 * - B02「明暗の円」: コントラスト強調を有効にする。実prefers-contrast:moreが一致すると開く。
 * - B03「斜線入りの動く円」: 動きの低減を有効にする。実prefers-reduced-motion:reduceが一致すると開く。
 * - B04「雫」: 透明度の低減を有効にする。対応環境で実prefers-reduced-transparency:reduceが一致すると開く。
 * - B05「反転した雫」: 強制配色を有効にする。実forced-colors:activeが一致すると開く。contrastとは別に判定する。
 * - B06「縦の画面」: viewportを縦長にする。実orientation:portraitが一致すると開く。入場時から縦長でもよい。
 * - B07「横の画面」: viewportを横長にする。実orientation:landscapeが一致すると開く。物理端末の姿勢には限定しない。
 * - B08「粗い点」: ページ倍率や表示環境を変えて実resolutionを1dppx未満にする。実resolution<1dppxが一致すると開く。ちょうど1では開かない。
 * - B09「細かい点」: ページ倍率や表示環境を変えて実resolutionを1dppx超にする。実resolution>1dppxが一致すると開く。入場時から一致していてもよい。
 * - B10「プリンター」: ブラウザーの印刷操作を開始する。元ページで実beforeprintを受けると開く。プレビューの取消は許容し、印刷/PDF保存の完了とは扱わない。
 * 使用API: matchMediaのmatches/change、Window.beforeprint。
 * 権限・privacy: 権限を要求せず、設定を上書きしない。観測値を保存・送信せず、印刷用の識別子やbackendを追加しない。
 * 対応環境: 各media featureを公開するブラウザー・設定環境。透明度低減等の限定対応を含むためL分類。未対応を成功にしない。
 */
function S930Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const solved = new Set<string>();
    const queries = mediaRequirements.map((requirement) => ({
      ...requirement,
      media: window.matchMedia(requirement.query),
    }));
    const inspect = () => {
      if (props.signal.aborted) return;
      const matches = new Set(
        queries.filter(({ media }) => media.matches).map(({ box }) => box),
      );
      setActive(matches);
      for (const box of matches) {
        if (!solved.has(box)) {
          solved.add(box);
          boxes.current[box].solve();
        }
      }
    };
    const printed = () => {
      if (!props.signal.aborted) boxes.current.B10.solve();
    };
    for (const { media } of queries) media.addEventListener("change", inspect);
    window.addEventListener("beforeprint", printed);
    inspect();
    const stop = () => {
      for (const { media } of queries)
        media.removeEventListener("change", inspect);
      window.removeEventListener("beforeprint", printed);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  return (
    <div
      className="puzzle puzzle--centered appearance-puzzle"
      data-portrait={active.has("B06")}
    >
      <div
        className="appearance-sample"
        aria-hidden="true"
        data-dark={active.has("B01")}
        data-contrast={active.has("B02")}
        data-motion={active.has("B03")}
        data-solid={active.has("B04")}
        data-forced={active.has("B05")}
        data-density={
          active.has("B08") ? "coarse" : active.has("B09") ? "fine" : "normal"
        }
      >
        <span>Aa</span>
        <i />
      </div>
      <div className="appearance-boxes">
        {manifest.boxIds.map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
          />
        ))}
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DarkModeOutlined,
      tone: "violet",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: ContrastOutlined,
      tone: "amber",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: MotionPhotosOffOutlined,
      tone: "green",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: OpacityOutlined,
      tone: "blue",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: InvertColorsOutlined,
      tone: "rose",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: StayCurrentPortraitOutlined,
      tone: "cyan",
      label: locale.B06,
    },
    [manifest.box.B07]: {
      icon: StayCurrentLandscapeOutlined,
      tone: "cyan",
      label: locale.B07,
    },
    [manifest.box.B08]: {
      icon: GrainOutlined,
      tone: "violet",
      label: locale.B08,
    },
    [manifest.box.B09]: {
      icon: BlurOnOutlined,
      tone: "violet",
      label: locale.B09,
    },
    [manifest.box.B10]: {
      icon: PrintOutlined,
      tone: "amber",
      label: locale.B10,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof window.matchMedia === "function" ? "available" : "unsupported",
    ),
  Component: S930Stage,
});
