import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
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

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * S-080
 *
 * 目的: 通常のbrowser tabではなく、install済みWeb Appのstandalone表示modeから開かれていることを検出する。
 * 最初の一手: browserのinstall機能でBusycubeを端末へ追加し、作成されたapp iconまたはlauncherから起動してこのstageへ入る。
 * 箱ごとの解法:
 * - B01「別の入口の箱」: `(display-mode: standalone)`のmedia queryが入場時またはmode変更時に`matches === true`なら開く。
 * 使用API: CSS Display Mode media featureと`window.matchMedia()`、`MediaQueryList`のchange event。
 * 権限・privacy: install permission以外の権限を要求せず、standaloneか否かのbooleanだけを判定し、install情報を保存・送信しない。
 * 対応環境: Web App ManifestからPWAをinstallでき、`display-mode: standalone`を`matchMedia`へ公開するbrowser。
 */
function S080Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [standalone, setStandalone] = useState(isStandalone);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const observe = () => {
      setStandalone(media.matches);
      if (media.matches) problem.solve();
    };
    media.addEventListener("change", observe);
    observe();
    return () => media.removeEventListener("change", observe);
  }, [problem.solve]);

  return (
    <div className="puzzle puzzle--centered">
      <div
        className={`door-clue ${standalone ? "door-clue--open" : ""}`}
        aria-hidden="true"
      >
        ▯
      </div>
      <p>{stageText(props.locale, locale.installHint)}</p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: InstallDesktopOutlined,
      color: "#f59e0b",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof window.matchMedia === "function" ? "available" : "unsupported",
    ),
  Component: S080Stage,
});
