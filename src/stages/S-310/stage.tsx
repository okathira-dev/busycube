import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

interface LaunchParamsLike {
  targetURL?: string;
}

interface LaunchQueueLike {
  setConsumer(consumer: (params: LaunchParamsLike) => void): void;
}

/**
 * S-310
 *
 * 目的: install済みWeb Appが通常URL、manifest shortcut、OSのnew-note actionという三種類の外部launch入口を受け取る。
 * 最初の一手: 表示されたlaunch URLでappをもう一度起動する。続いてapp iconのcontext menuからshortcut、OSのnote作成入口からBusycubeを起動する。
 * 箱ごとの解法:
 * - B01「再起動の箱」: 初期URLまたはLaunchQueueの`targetURL`で`stage=S-310`かつ`launch=busycube`が完全一致すると開く。
 * - B02「ショートカットの箱」: manifest shortcut専用URLが初期URLまたはLaunchQueueへ入り、`source=shortcut`なら開く。
 * - B03「新しいメモの箱」: manifest `note_taking.new_note_url`が初期URLまたはLaunchQueueへ入り、`source=note`なら開く。
 * 使用API: Web App Manifestの`launch_handler` / `shortcuts` / `note_taking`、Launch Handler APIの`window.launchQueue.setConsumer()`、URL API。
 * 権限・privacy: 権限を要求せず、launch URLの固定parameterだけを判定する。外部app情報やnote内容を取得・保存・送信しない。
 * 対応環境: Busycubeをinstallでき、Launch Handler APIと各manifest起動surfaceを実装するbrowser/OS。
 */
function S310Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const shortcut = props.boxes[manifest.box.B02];
  const note = props.boxes[manifest.box.B03];
  const [status, setStatus] = useState("waiting");
  const targetUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("stage", "S-310");
    url.searchParams.set("launch", "busycube");
    return url.href;
  }, []);

  useEffect(() => {
    let active = true;
    const inspect = (target: string) => {
      const url = new URL(target, location.href);
      const source = url.searchParams.get("source");
      if (source === "shortcut") shortcut.solve();
      if (source === "note") note.solve();
      if (
        url.searchParams.get("stage") === "S-310" &&
        url.searchParams.get("launch") === "busycube"
      ) {
        setStatus("launched");
        problem.solve();
      }
    };
    inspect(location.href);
    const queue = (
      window as unknown as Window & { launchQueue: LaunchQueueLike }
    ).launchQueue;
    queue.setConsumer((params) => {
      if (!active || !params.targetURL) return;
      inspect(params.targetURL);
    });
    return () => {
      active = false;
    };
  }, [note.solve, problem.solve, shortcut.solve]);

  return (
    <div className="puzzle puzzle--centered">
      <p className="measurement">
        {stageText(props.locale, locale.relaunchHint)}
      </p>
      <a className="stage-action" href={targetUrl}>
        {stageText(props.locale, locale.launchUrl)}
      </a>
      <p className="launch-url">{targetUrl}</p>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
        <StageProblemGiftBox box={shortcut} locale={props.locale} />
        <StageProblemGiftBox box={note} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: OpenInNewOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: OpenInNewOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: OpenInNewOutlined,
      color: "#818cf8",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "launchQueue" in window ? "available" : "unsupported",
    ),
  Component: S310Stage,
});
