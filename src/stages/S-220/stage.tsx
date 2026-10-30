import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import { useEffect } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-220
 *
 * 目的: ブラウザーの戻る・実再読み込み・進むでこのステージへ到着したことを区別する。
 * 最初の一手: 別ステージへ移動してからブラウザーの戻るでこのステージへ復帰する。
 * 箱ごとの解法:
 * - B05「左矢印」: 別ページまたは別ステージからブラウザーの戻るで復帰する。Navigation APIのtraverseで移動先entry.indexが移動元より小さい到着を観測すると開く。
 * - B03「再読み込み」: このステージを表示したままブラウザーを再読み込みする。初期URLがS-220でPerformanceNavigationTiming.typeがreloadのdocument到着時に開く。後からステージ移動で入っても開かない。
 * - B06「右矢印」: ブラウザーの進むでこのステージへ復帰する。Navigation APIのtraverseで移動先entry.indexが移動元より大きい到着を観測すると開く。
 * 使用API: Navigation APIのactivation/currententrychangeとentry.index、Performance Navigation Timing、pageshow。
 * 権限・privacy: 権限を要求せず、方向とゲーム内stage訪問集合をdocument内だけで扱う。他サイトの履歴・移動先を保存・送信しない。
 * 対応環境: Navigation APIを実装するブラウザー。reloadはPerformance Navigation Timingで観測する。
 */
function S220Stage(props: Props) {
  const { arrival } = props.services;
  const back = props.boxes.B05;
  const reload = props.boxes.B03;
  const forward = props.boxes.B06;
  useEffect(() => {
    if (arrival?.stageId !== manifest.id || props.signal.aborted) return;
    if (arrival.kind === "back") back.solve();
    if (arrival.kind === "reload") reload.solve();
    if (arrival.kind === "forward") forward.solve();
  }, [arrival, back.solve, reload.solve, forward.solve, props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={back} locale={props.locale} />
        <StageProblemGiftBox box={reload} locale={props.locale} />
        <StageProblemGiftBox box={forward} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B05]: {
      icon: ArrowBackOutlined,
      tone: "rose",
      label: locale.B05,
    },
    [manifest.box.B03]: {
      icon: RefreshOutlined,
      tone: "amber",
      label: locale.B03,
    },
    [manifest.box.B06]: {
      icon: ArrowForwardOutlined,
      tone: "cyan",
      label: locale.B06,
    },
  },
  Component: S220Stage,
});
