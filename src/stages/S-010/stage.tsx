import EditOutlined from "@mui/icons-material/EditOutlined";
import MouseOutlined from "@mui/icons-material/MouseOutlined";
import TouchAppOutlined from "@mui/icons-material/TouchAppOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-010
 *
 * 目的: 同じpointer操作を、端末が報告する`pointerType`ごとにmouse・touch・penへ識別する。
 * 最初の一手: mouseで「マウスの箱」を押し、残りはtouchscreenとpenを使って対応する箱を直接押す。
 * 箱ごとの解法:
 * - B01「マウスの箱」: mouseで箱を押し、`pointerdown`の`pointerType`が厳密に`mouse`なら開く。
 * - B02「タッチの箱」: 指で箱を押し、`pointerdown`の`pointerType`が厳密に`touch`なら開く。
 * - B03「ペンの箱」: stylusで箱を押し、`pointerdown`の`pointerType`が厳密に`pen`なら開く。
 * 使用API: Pointer Eventsの`pointerdown` eventと`PointerEvent.pointerType`。
 * 権限・privacy: 権限を要求せず、座標や筆圧は取得・保存せず、該当したpointer種別の開箱だけを進捗に残す。
 * 対応環境: Pointer Eventsを実装し、各箱に必要なmouse・touchscreen・stylusを接続できるbrowserと端末。
 */
function S010Stage(props: Props) {
  const boxes = [
    ["mouse", props.boxes.B01],
    ["touch", props.boxes.B02],
    ["pen", props.boxes.B03],
  ] as const;

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row" aria-live="polite">
        {boxes.map(([pointerType, box]) => (
          <StageProblemGiftBox
            key={box.id}
            box={box}
            locale={props.locale}
            onPointerDown={(event) => {
              if (event.pointerType === pointerType) box.solve();
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: MouseOutlined,
      tone: "blue",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: TouchAppOutlined,
      tone: "rose",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: EditOutlined,
      tone: "green",
      label: locale.B03,
    },
  },
  Component: S010Stage,
});
