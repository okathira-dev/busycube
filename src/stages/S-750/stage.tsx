import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

type OTPCredentialLike = Credential & { readonly code: string };

function makeCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(value % 1_000_000).padStart(6, "0");
}

/**
 * S-750
 *
 * 目的: origin-bound実SMSからWebOTP credentialまたはOS Security Code AutoFillがcurrent 6桁codeを渡した事実を観測する。
 * 最初の一手: 表示SMS全文を別端末・協力者からこの端末へ実送信してもらい、受信前に「SMSを待つ」を押してbrowser/OSの確認UIを完了する。
 * 箱ごとの解法:
 * - B01「SMSコードの箱」: `OTPCredential.code`がcurrent codeと一致するか、最初は空でpaste/drop/composition汚染のないone-time-code欄へtrusted inputされ、`:autofill`かつvalue一致なら開く。
 * 使用API: WebOTP/Credentials Management API、OTPCredential SMS transport、`autocomplete="one-time-code"`、CSS `:autofill`、trusted input events、Web Crypto random。
 * 権限・privacy: 6桁codeはattempt memoryだけに置き、電話番号・送信者・SMS本文・到着時刻・入力履歴を保存・送信しない。SMS送信自体の料金・連絡先共有は利用者側で確認する。
 * 対応環境: secure contextのWebOTP対応mobile browser、または実`:autofill`状態を公開するSecurity Code AutoFill対応browser/OS。
 */
function S750Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [code, setCode] = useState(makeCode);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const contaminatedRef = useRef(false);
  const startedEmptyRef = useRef(true);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );
  const sms = `${props.locale === "ja" ? "Busycubeの封書です。" : "Busycube letter."}\n\n@${location.host} #${code}`;

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    if (inputRef.current) inputRef.current.value = "";
    contaminatedRef.current = false;
    startedEmptyRef.current = true;
    setCode(makeCode());
    setStatus(stageText(props.locale, locale.idle));
  };

  useEffect(() => {
    const stop = () => controllerRef.current?.abort();
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const requestOtp = async () => {
    const credentials = navigator.credentials as unknown as {
      get(options: {
        otp: { transport: ["sms"] };
        signal: AbortSignal;
      }): Promise<Credential | null>;
    };
    if (!("OTPCredential" in window) || !credentials?.get) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus(stageText(props.locale, locale.waiting));
    try {
      const credential = (await credentials.get({
        otp: { transport: ["sms"] },
        signal: controller.signal,
      })) as OTPCredentialLike | null;
      if (!credential || credential.code !== code) {
        setStatus(stageText(props.locale, locale.manual));
        return;
      }
      if (inputRef.current) inputRef.current.value = credential.code;
      problem.solve();
      setStatus(stageText(props.locale, locale.received));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  const onInput = (event: React.FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    let autofilled = false;
    try {
      autofilled = input.matches(":autofill");
    } catch {
      autofilled = false;
    }
    if (
      event.nativeEvent.isTrusted &&
      startedEmptyRef.current &&
      !contaminatedRef.current &&
      autofilled &&
      input.value === code
    ) {
      problem.solve();
      setStatus(stageText(props.locale, locale.received));
      return;
    }
    setStatus(stageText(props.locale, locale.manual));
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.instruction)}</p>
      <pre className="s750-sms">{sms}</pre>
      <label className="stage-field">
        <span>{stageText(props.locale, locale.inputLabel)}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          title={stageText(props.locale, locale.inputLabel)}
          onBeforeInput={(event) => {
            if (event.nativeEvent.isTrusted) {
              startedEmptyRef.current = event.currentTarget.value.length === 0;
            }
          }}
          onPaste={() => {
            contaminatedRef.current = true;
          }}
          onDrop={() => {
            contaminatedRef.current = true;
          }}
          onCompositionStart={() => {
            contaminatedRef.current = true;
          }}
          onInput={onInput}
        />
      </label>
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          onClick={() => void requestOtp()}
        >
          {stageText(props.locale, locale.request)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => {
            void navigator.clipboard
              .writeText(sms)
              .then(() => setStatus(stageText(props.locale, locale.copied)))
              .catch(() =>
                setStatus(stageText(props.locale, locale.cancelled)),
              );
          }}
        >
          {stageText(props.locale, locale.copy)}
        </button>
        <button type="button" className="stage-action" onClick={reset}>
          {stageText(props.locale, locale.reset)}
        </button>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: NotificationsOutlined,
      color: "#f472b6",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "credentials" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S750Stage,
});
