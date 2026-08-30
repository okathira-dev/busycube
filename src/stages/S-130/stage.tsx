import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { type ChangeEvent, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isKeyFile(
  value: unknown,
): value is { format: "busycube-key-v1"; token: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { format?: unknown; token?: unknown };
  return (
    candidate.format === "busycube-key-v1" &&
    typeof candidate.token === "string"
  );
}

/**
 * S-130
 *
 * 目的: このattemptで生成した鍵fileをbrowser外へdownloadし、同じfileをfile pickerから戻して往復を確認する。
 * 最初の一手: 「鍵を外へ出す」で`.busykey` fileをdownloadし、続けて「鍵を戻す」からそのfileを選ぶ。
 * 箱ごとの解法:
 * - B01「鍵を外へ出す箱」: 18 random byteのtokenを生成してSHA-256 hashをattempt内に保持し、`busycube-key.busykey`のdownloadを開始すると開く。
 * - B02「鍵を戻す箱」: 4,096 byte以下で`format === "busycube-key-v1"`とstring tokenを持つJSON fileを選び、そのtokenのSHA-256が直前に生成したattempt内hashと一致すると開く。
 * 使用API: Web Cryptoの`getRandomValues()` / `subtle.digest()`、Blob URL、download属性付きanchor、File APIとnative file picker。
 * 権限・privacy: file選択は利用者操作に限定し、選んだfileは形式とtoken一致の判定にだけ使う。token/hash/file内容を永続保存・外部送信しない。
 * 対応環境: secure contextでWeb Crypto、Blob URL、file downloadとfile input uploadを利用できるbrowser。
 */
function S130Stage(props: Props) {
  const exportProblem = props.boxes[manifest.box.B01];
  const importProblem = props.boxes[manifest.box.B02];
  const [status, setStatus] = useState("");
  const [attemptKeyHash, setAttemptKeyHash] = useState<string | null>(null);

  const exportKey = async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const token = btoa(String.fromCharCode(...bytes));
    const hash = await hashToken(token);
    if (props.signal.aborted) return;
    setAttemptKeyHash(hash);
    exportProblem.solve();
    const blob = new Blob(
      [JSON.stringify({ format: "busycube-key-v1", token })],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "busycube-key.busykey";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importKey = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || file.size > 4096) {
      setStatus("invalid");
      return;
    }
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!isKeyFile(value)) throw new Error("invalid key file");
      const hash = await hashToken(value.token);
      if (props.signal.aborted) return;
      if (hash !== attemptKeyHash) throw new Error("different key");
      importProblem.solve();
      setStatus("matched");
    } catch {
      if (!props.signal.aborted) setStatus("invalid");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={exportProblem} locale={props.locale} />
        <StageProblemGiftBox box={importProblem} locale={props.locale} />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void exportKey()}
      >
        {stageText(props.locale, locale.sendKey)}
      </button>
      <label className="stage-action file-action">
        {stageText(props.locale, locale.returnKey)}
        <input
          type="file"
          accept=".busykey,application/json"
          onChange={(event) => void importKey(event)}
        />
      </label>
      <p role="status">{status ? statusText(props.locale, status) : null}</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: FileUploadOutlined,
      color: "#34d399",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: FileDownloadOutlined,
      color: "#10b981",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && crypto.subtle ? "available" : "unsupported",
    ),
  Component: S130Stage,
});
