import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
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
 * S-060
 * 目的: 別ステージから戻るという再訪を一箱で発見する。
 * 最初の一手: 折り返す矢印を見て別stageへ移動し、このstageへ戻る。
 * 箱ごとの解法:
 * - B03「折り返す矢印」: 別stageへ移動してから戻る。同じdocument内のゲーム移動履歴で別stage経由の再訪が観測されると開く。reloadや一覧だけの往復では開かない。
 * 使用API: ゲーム内stage移動履歴、React effect。
 * 権限・privacy: 権限不要。到着情報はmemoryだけで扱い、訪問ログを保存・送信しない。
 * 対応環境: 通常のbrowser。旧B01/B02履歴は保存したまま新しい達成へコピーしない。
 */
function S060Stage(props: Props) {
  const box = props.boxes.B03;
  const { arrival } = props.services;
  useEffect(() => {
    if (
      arrival?.stageId === manifest.id &&
      arrival.revisit &&
      !props.signal.aborted
    )
      box.solve();
  }, [arrival, box.solve, props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={box} locale={props.locale} />
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: KeyboardReturnOutlined,
      tone: "violet",
      label: locale.B03,
    },
  },
  Component: S060Stage,
});
