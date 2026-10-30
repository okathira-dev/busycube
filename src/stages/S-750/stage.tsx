import "./styles.css";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import PhoneAndroidOutlined from "@mui/icons-material/PhoneAndroidOutlined";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import SmsOutlined from "@mui/icons-material/SmsOutlined";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type OTPCredentialLike = Credential & { readonly code: string };
type OtpWindow = Window & {
  OTPCredential?: new (...args: never[]) => OTPCredentialLike;
};
type Attempt = { code: string; controller: AbortController; active: boolean };
function makeCode(previous?: string): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0];
  if (value === undefined) throw new Error("No random code");
  const next =
    previous === undefined
      ? value % 1_000_000
      : (Number(previous) + 1 + (value % 999_999)) % 1_000_000;
  return String(next).padStart(6, "0");
}
/**
 * S-750
 * 目的: 今回のorigin-bound六桁コードを実WebOTPまたはOS Security Code AutoFillから受け取る。
 * 最初の一手: SMSの吹き出し箱で待機を始め、別の電話から届く図と今回のSMS本文を見る。
 * 箱ごとの解法:
 * - B01「SMSの吹き出し」: 素材のSMSを別の電話等から端末へ送ってもらい、箱から始めた待機でbrowser/OSの受信確認を完了する。実getのOTPCredential instance/type otp/codeが今回の六桁に一致すると開く。OS経路は同じ待機中の空欄へのtrusted inputで、paste/drop/composition汚染なし、実:autofillと今回codeの一致が必要。手入力・貼付・不一致/古い応答は達成にしない。新しいコードの回転矢印は古い待機を中断し、別codeで待機し直せる。
 * 使用API: WebOTP/Credentials Management SMS transport、OTPCredential、autocomplete one-time-code、CSS :autofill、trusted input、Web Crypto、明示copyのClipboard。
 * 権限・privacy: SMS本文/コードは問題素材としてmemoryにだけ持ち、電話番号・送信者・SMS到着時刻・入力履歴を取得/保存/外部送信しない。SMS送信はページの通信機能として実装しない。
 * 対応環境: secure contextの実WebOTP対応mobile browser、または入力event/:autofill状態を公開するOS Security Code AutoFill環境。後者の実環境成立は未観測として区別し、通常の文字入力を代用しない。
 */
function S750Stage(props: Props) {
  const [code, setCode] = useState(makeCode);
  const codeRef = useRef(code);
  codeRef.current = code;
  const inputRef = useRef<HTMLInputElement>(null);
  const attempt = useRef<Attempt | null>(null);
  const contaminated = useRef(false);
  const startedEmpty = useRef(true);
  const solved = useRef(false);
  const live = useRef(true);
  const [status, setStatus] = useState("idle");
  const [waiting, setWaiting] = useState(false);
  const sms = `${props.locale === "ja" ? "Busycubeの封書です。" : "Busycube letter."}\n\n@${location.hostname} #${code}`;
  const stop = useCallback(() => {
    if (attempt.current) {
      attempt.current.active = false;
      attempt.current.controller.abort();
      attempt.current = null;
    }
  }, []);
  useEffect(() => {
    live.current = true;
    const release = () => {
      live.current = false;
      stop();
    };
    props.signal.addEventListener("abort", release, { once: true });
    if (props.signal.aborted) release();
    return () => {
      release();
      props.signal.removeEventListener("abort", release);
    };
  }, [props.signal, stop]);
  const valid = (current: Attempt) =>
    live.current &&
    !props.signal.aborted &&
    current.active &&
    attempt.current === current &&
    !current.controller.signal.aborted &&
    current.code === codeRef.current;
  const receive = (current: Attempt) => {
    if (!valid(current)) return;
    current.active = false;
    current.controller.abort();
    attempt.current = null;
    setWaiting(false);
    setStatus("success");
    if (!solved.current) {
      solved.current = true;
      props.boxes.B01.solve();
    }
  };
  const reset = () => {
    if (!live.current || props.signal.aborted) return;
    stop();
    if (inputRef.current) inputRef.current.value = "";
    contaminated.current = false;
    startedEmpty.current = true;
    const next = makeCode(codeRef.current);
    codeRef.current = next;
    setCode(next);
    setWaiting(false);
    setStatus("idle");
  };
  const requestOtp = async () => {
    if (!live.current || props.signal.aborted) return;
    stop();
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    contaminated.current = false;
    startedEmpty.current = true;
    const current: Attempt = {
      code: codeRef.current,
      controller: new AbortController(),
      active: true,
    };
    attempt.current = current;
    setWaiting(true);
    setStatus("waiting");
    const Constructor = (window as OtpWindow).OTPCredential;
    const credentials = navigator.credentials as unknown as
      | {
          get?: (options: {
            otp: { transport: ["sms"] };
            signal: AbortSignal;
          }) => Promise<Credential | null>;
        }
      | undefined;
    if (typeof Constructor !== "function" || !credentials?.get) {
      setStatus("unavailable");
      return;
    }
    try {
      const credential = await credentials.get({
        otp: { transport: ["sms"] },
        signal: current.controller.signal,
      });
      if (!valid(current)) return;
      if (
        !(credential instanceof Constructor) ||
        credential.type !== "otp" ||
        credential.code !== current.code
      ) {
        setStatus("invalid");
        return;
      }
      if (inputRef.current) inputRef.current.value = credential.code;
      receive(current);
    } catch (error) {
      if (!valid(current)) return;
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "cancelled",
      );
    }
  };
  const onInput = (event: FormEvent<HTMLInputElement>) => {
    const current = attempt.current;
    if (!current || !valid(current)) return;
    const input = event.currentTarget;
    let autofilled = false;
    try {
      autofilled = input.matches(":autofill");
    } catch {}
    if (
      event.nativeEvent.isTrusted &&
      startedEmpty.current &&
      !contaminated.current &&
      autofilled &&
      input.value === current.code
    )
      receive(current);
    else setStatus("invalid");
  };
  const copy = async () => {
    if (!live.current || props.signal.aborted) return;
    try {
      await navigator.clipboard.writeText(sms);
      if (live.current && !props.signal.aborted) setStatus("copied");
    } catch {
      if (live.current && !props.signal.aborted) setStatus("error");
    }
  };
  return (
    <div className="puzzle puzzle--centered s750-puzzle" data-waiting={waiting}>
      <StageProblemGiftBox
        box={props.boxes.B01}
        locale={props.locale}
        onClick={() => void requestOtp()}
      />
      <div className="s750-journey" aria-hidden="true">
        <span>
          <PhoneIphoneOutlined />
          <SmsOutlined />
        </span>
        <ArrowForwardOutlined />
        <PhoneAndroidOutlined />
      </div>
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
            if (event.nativeEvent.isTrusted)
              startedEmpty.current = event.currentTarget.value.length === 0;
          }}
          onPaste={() => {
            contaminated.current = true;
          }}
          onDrop={() => {
            contaminated.current = true;
          }}
          onCompositionStart={() => {
            contaminated.current = true;
          }}
          onInput={onInput}
        />
      </label>
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.copy)}
          onClick={() => void copy()}
        >
          <ContentCopyOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.reset)}
          onClick={reset}
        >
          <RefreshOutlined aria-hidden="true" />
        </button>
      </div>
      <p className="interaction-status" role="status">
        {status === "copied"
          ? stageText(props.locale, locale.copied)
          : statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: { B01: { icon: SmsOutlined, color: "#f472b6", label: locale.B01 } },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "credentials" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S750Stage,
});
