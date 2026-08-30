import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
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

const key = "busycube:S-440:round";
/**
 * S-440
 *
 * 目的: このattemptで作った`.busycube` fileをOSへ保存し、installed appのfile handlerとして開き直して同じroundを照合する。
 * 最初の一手: Busycubeをinstallした環境で「.busycubeを保存」を押し、downloadされたfileをfile manager等からBusycubeで開く。
 * 箱ごとの解法:
 * - B01「ファイル起動の箱」: LaunchQueueの先頭FileSystemFileHandleを読み、JSON payloadの`round`がdownload時にlocalStorageへ保存したroundと完全一致すると開く。
 * 使用API: Web App Manifest `file_handlers`、Launch Handler APIのLaunchQueue files、File System Access handle、File/Blob/Blob URL、download anchor、Web Crypto UUID、localStorage。
 * 権限・privacy: fileにはkindと一時random roundだけを含め、handlerは利用者が開いた先頭fileだけを読む。file本文やfile名を永続保存・外部送信しない。
 * 対応環境: Busycubeをinstallでき、`.busycube` MIME/extensionのPWA file handlingとLaunchQueue filesを提供するbrowser/OS。
 */
function S440Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const round = useMemo(() => crypto.randomUUID(), []);
  const [status, setStatus] = useState("waiting");
  useEffect(() => {
    let active = true;
    window.launchQueue?.setConsumer(async (params) => {
      const handle = params.files[0];
      if (!active || !handle) return;
      try {
        const file = await handle.getFile();
        const payload = JSON.parse(await file.text()) as { round?: string };
        if (payload.round && payload.round === localStorage.getItem(key)) {
          problem.solve();
          setStatus(file.name);
        }
      } catch {
        setStatus("invalid");
      }
    });
    return () => {
      active = false;
    };
  }, [problem.solve]);
  const download = () => {
    localStorage.setItem(key, round);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ kind: "busycube", round })], {
        type: "application/x-busycube",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${round}.busycube`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("downloaded");
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <button type="button" className="stage-action" onClick={download}>
        {stageText(props.locale, locale.saveBusycube)}
      </button>
      <p role="status">{statusText(props.locale, status)}</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: FileDownloadOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "launchQueue" in window ? "available" : "unsupported",
    ),
  Component: S440Stage,
});
