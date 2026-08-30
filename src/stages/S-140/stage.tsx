import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-140
 *
 * 目的: 設定済みGoogle Drive同期をこのattemptで実行し、backup成功と別端末由来のremote data検出を分けて確認する。
 * 最初の一手: Google Drive連携を設定した状態で「端末をつなぐ」を押す。B02には同じDrive dataを先に別端末から同期しておく。
 * 箱ごとの解法:
 * - B01「バックアップの箱」: buttonから`drive.sync()`を新たに実行し、返却結果の`synced`が`true`なら開く。
 * - B02「別端末の箱」: 同じ成功した同期結果で`remoteDevice`も`true`、つまり別device ID由来の記録が見つかれば開く。
 * 使用API: runtimeが注入するGoogle Drive同期serviceの`configured`状態と`sync()`結果。
 * 権限・privacy: Google認証とDrive app dataへのaccessは利用者操作に基づく。stageは同期結果のbooleanだけを受け取り、account情報やremote data本文を保持しない。
 * 対応環境: Google Drive clientが設定済みで、認証・network通信・同一accountによる複数端末同期を実行できるbrowser。
 */
function S140Stage(props: Props) {
  const backupProblem = props.boxes[manifest.box.B01];
  const deviceProblem = props.boxes[manifest.box.B02];
  const [status, setStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const drive = props.services.drive;

  const sync = async () => {
    if (!drive?.configured) return;
    setStatus("syncing");
    // The stage consumes the fresh result instead of persistent observations so
    // reopening a cleared stage still requires a sync during this attempt.
    try {
      const result = await drive.sync();
      if (props.signal.aborted) return;
      if (!result.synced) {
        setStatus("error");
        return;
      }
      backupProblem.solve();
      if (result.remoteDevice) {
        deviceProblem.solve();
      }
      setStatus("success");
    } catch {
      if (props.signal.aborted) return;
      setStatus("error");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="cloud-clue" aria-hidden="true">
        ☁
      </div>
      <div className="problem-row">
        <StageProblemGiftBox box={backupProblem} locale={props.locale} />
        <StageProblemGiftBox box={deviceProblem} locale={props.locale} />
      </div>
      <button
        type="button"
        className="stage-action"
        disabled={!drive?.configured || status === "syncing"}
        onClick={() => void sync()}
      >
        {!drive?.configured
          ? stageText(props.locale, locale.driveNotConfigured)
          : stageText(props.locale, locale.connectDevices)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: CloudUploadOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: DevicesOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
  },
  probe: () => "available",
  Component: S140Stage,
});
