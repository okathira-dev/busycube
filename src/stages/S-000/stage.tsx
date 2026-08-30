import AdsClickOutlined from "@mui/icons-material/AdsClickOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-000
 *
 * 目的: 最初のギフトボックスを通常のUI操作で開き、箱を直接操作する基本ルールを理解する。
 * 最初の一手: 画面中央の「クリックする箱」へポインターを合わせてクリックする。
 * 箱ごとの解法:
 * - B01「クリックする箱」: 箱自身をクリックし、`StageProblemGiftBox`の`onClick`が呼ばれた時点で開く。
 * 使用API: HTML button相当のクリック操作とReactの`onClick` handler。
 * 権限・privacy: 権限、端末情報、入力内容、外部通信を使用せず、開箱状態だけを通常進捗として扱う。
 * 対応環境: buttonをクリックまたは同等のkeyboard操作でactivateできる一般的なbrowser。
 */
function S000Stage(props: Props) {
  const box = props.boxes.B01;
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox
        box={box}
        locale={props.locale}
        onClick={box.solve}
      />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: AdsClickOutlined,
      tone: "violet",
      label: locale.B01,
    },
  },
  Component: S000Stage,
});
