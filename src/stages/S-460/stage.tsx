import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-460
 *
 * 目的: installed appのclient areaがOS title barへ拡張された実Window Controls Overlay領域内で箱をclickする。
 * 最初の一手: Busycubeをinstall済みapp windowで開き、title barのoverlay表示を有効にして、title bar内へ配置された箱をclickする。
 * 箱ごとの解法:
 * - B01「オーバーレイの箱」: click時に`windowControlsOverlay.visible`がtrueで、eventのclient座標が`getTitlebarAreaRect()`のleft/right/top/bottom内なら開く。
 * 使用API: Window Controls Overlay APIの`visible` / `getTitlebarAreaRect()` / `geometrychange`とpointer click座標。
 * 権限・privacy: 権限を要求せず、overlay可視状態とclick座標はその場の範囲判定にだけ使い、保存・送信しない。
 * 対応環境: Window Controls Overlay付きでinstallでき、manifestの`display_override`を反映するdesktop browser/OS。
 */
function S460Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [visible, setVisible] = useState(false);
  const overlay = navigator.windowControlsOverlay;
  useEffect(() => {
    const inspect = () => setVisible(Boolean(overlay?.visible));
    inspect();
    overlay?.addEventListener("geometrychange", inspect);
    return () => overlay?.removeEventListener("geometrychange", inspect);
  }, []);
  return (
    <div className="puzzle puzzle--centered">
      <div className="overlay-box">
        <StageProblemGiftBox
          box={problem}
          locale={props.locale}
          onClick={(event) => {
            if (!overlay?.visible) return;
            const rect = overlay.getTitlebarAreaRect();
            if (
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom
            )
              problem.solve();
          }}
        />
      </div>
      <p role="status">
        {visible
          ? stageText(props.locale, locale.overlayVisible)
          : stageText(props.locale, locale.browserWindow)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: WindowOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "windowControlsOverlay" in navigator ? "available" : "unsupported",
    ),
  Component: S460Stage,
});
