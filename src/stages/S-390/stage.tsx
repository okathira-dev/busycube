import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { randomBytes } from "../shared/webauthn";
import { locale } from "./locale";

/**
 * S-390
 *
 * 目的: WebAuthn要求が一致credentialなしで拒否される結果と、待機中conditional要求をAbortSignalで中断する結果を観測する。
 * 最初の一手: 「一致しない鍵」でauthenticator UIを完了または終了し、次に「待ち始める」を押してから「中断する」を押す。
 * 箱ごとの解法:
 * - B01「一致なしの箱」: random 32 byte IDだけをallowCredentialsに指定した`credentials.get()`が`NotAllowedError`でrejectされると開く。
 * - B02「中断の箱」: conditional mediationの`credentials.get()`を専用AbortControllerで待機させ、stage自体は離脱せずそのcontrollerをabortし、`AbortError`を受けると開く。
 * 使用API: WebAuthn/Credential Management API、conditional mediation、AbortController/AbortSignal、Web Crypto random。
 * 権限・privacy: authenticator標準UI以外から資格情報を取得せず、challengeと不一致IDはattemptごとにrandom生成する。credential・失敗内容を保存・送信しない。
 * 対応環境: secure contextでPublicKeyCredential、conditional WebAuthn要求とAbortSignal中断を実装するbrowser/OS。
 */
function S390Stage(props: Props) {
  const noMatch = props.boxes[manifest.box.B01];
  const abortBox = props.boxes[manifest.box.B02];
  const pending = useRef<AbortController | null>(null);
  const [status, setStatus] = useState("");
  const requestNoMatch = async () => {
    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(),
          rpId: location.hostname,
          allowCredentials: [{ type: "public-key", id: randomBytes(32) }],
          timeout: 30000,
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        noMatch.solve();
        setStatus("no-match");
      }
    }
  };
  const begin = () => {
    const controller = new AbortController();
    pending.current = controller;
    setStatus("pending");
    void navigator.credentials
      .get({
        mediation: "conditional",
        signal: controller.signal,
        publicKey: {
          challenge: randomBytes(),
          rpId: location.hostname,
          timeout: 120000,
        },
      })
      .catch((error) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError" &&
          controller.signal.aborted &&
          !props.signal.aborted
        ) {
          abortBox.solve();
          setStatus("aborted");
        }
      });
  };
  useEffect(() => {
    const cancel = () => pending.current?.abort();
    props.signal.addEventListener("abort", cancel, { once: true });
    return () => props.signal.removeEventListener("abort", cancel);
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={noMatch} locale={props.locale} />
        <StageProblemGiftBox box={abortBox} locale={props.locale} />
      </div>
      <div className="stage-actions">
        <button
          type="button"
          className="stage-action"
          onClick={() => void requestNoMatch()}
        >
          {stageText(props.locale, locale.noMatchKey)}
        </button>
        <button type="button" className="stage-action" onClick={begin}>
          {stageText(props.locale, locale.beginWaiting)}
        </button>
        <button
          type="button"
          className="stage-action"
          disabled={!pending.current}
          onClick={() => pending.current?.abort()}
        >
          {stageText(props.locale, locale.abort)}
        </button>
      </div>
      <p className="interaction-status" role="status">
        {status === "no-match"
          ? stageText(props.locale, locale.noMatchKey)
          : statusText(props.locale, status)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: HourglassEmptyOutlined,
      color: "#f59e0b",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: HourglassEmptyOutlined,
      color: "#94a3b8",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "credentials" in navigator &&
      "PublicKeyCredential" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S390Stage,
});
