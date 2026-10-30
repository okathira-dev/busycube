import "./styles.css";
import KeyOffOutlined from "@mui/icons-material/KeyOffOutlined";
import LockOpenOutlined from "@mui/icons-material/LockOpenOutlined";
import { createSvgIcon } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { randomBytes } from "../shared/webauthn";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type Kind = "create" | "conditional" | "refusal";
interface Request {
  kind: Kind;
  controller: AbortController;
  dispose(): void;
}
const waitLimit = 110_000;
const KeyAdd = createSvgIcon(
  <>
    <path d="M7 5a6 6 0 1 0 5.65 8H17v3h3v-3h3V9H12.65A6 6 0 0 0 7 5Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
    <path d="M17 0h2v3h3v2h-3v3h-2V5h-3V3h3Z" />
  </>,
  "KeyAdd",
);

function policyAllows(
  operation: "publickey-credentials-create" | "publickey-credentials-get",
) {
  const policy =
    (
      document as Document & {
        permissionsPolicy?: { allowsFeature(name: string): boolean };
        featurePolicy?: { allowsFeature(name: string): boolean };
      }
    ).permissionsPolicy ??
    (
      document as Document & {
        featurePolicy?: { allowsFeature(name: string): boolean };
      }
    ).featurePolicy;
  return policy?.allowsFeature(operation) !== false;
}

/**
 * S-380
 * 目的: 実パスキーの作成・conditional候補による利用・通常認証の拒否/失敗を三つの箱から観測する。
 * 最初の一手: 鍵と＋の箱から架空のBusycube用パスキーを作る。利用箱はアカウント欄へフォーカスしてconditional候補を選べる状態にする。
 * 箱ごとの解法:
 * - B01「鍵と＋」: 箱からresidentKey required/userVerification preferred/attestation noneでcredentials.createを開始し、実PublicKeyCredentialが返ると開く。IDの保存完了や次の利用との一致は条件にしない。
 * - B02「開いた錠前」: 箱で入力欄をフォーカスし、実conditional mediationのパスキー候補を選ぶ。isConditionalMediationAvailableがtrueの環境でmediation conditionalのcredentials.getが実PublicKeyCredentialを返ると開く。手入力・別の通常認証・作成IDとの照合で代替しない。
 * - B04「斜線付きの鍵」: 箱から通常のパスキー認証を開始し、認証UIで拒否/取消等を行う。secure/top-level/可視/操作起点/Permissions Policy許可下で、同じRP・新challenge・空のallowCredentialsという正常要求を発行し、ゲーム中断/期限切れではないNotAllowedErrorなら開く。userVerification requiredの実認証失敗も含む。APIは取消とOS/browser側の不許可/期限を細分しないため、取消だけを証明しない。旧B03の不正ID失敗は移行しない。
 * 使用API: WebAuthn/Credential Management、PublicKeyCredential.isConditionalMediationAvailable、AbortController、Page Visibility、Web Crypto。別箱の開始・離脱・110秒のゲーム側待機終了ではabortし、拒否箱を開けない。認証器UIへの移動を妨げないよう非表示だけではabortせず、非表示中のNotAllowedErrorは拒否達成にしない。
 * 権限・privacy: OS/authenticatorで利用者の同意/検証を行う。架空のlocal.invalid userを使い、rawId/応答/署名/生体情報を表示・保存・送信しない。実秘密鍵は端末/管理サービスに残るため片付けの案内を維持する。これはサーバーの本人認証ではない。
 * 対応環境: secure contextでWebAuthnのresident credential/conditional mediationを利用できるbrowser・OS・authenticator。未対応/政策拒否/不正要求と、正常な認証要求の拒否を区別する。
 */
function S380Stage(props: Props) {
  const [status, setStatus] = useState<CommonStatus | "waitingEnded">("idle");
  const [pending, setPending] = useState<Kind | null>(null);
  const active = useRef(false);
  const request = useRef<Request | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const solved = useRef(new Set<string>());
  useEffect(() => {
    active.current = !props.signal.aborted;
    const dispose = () => {
      active.current = false;
      request.current?.dispose();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);

  const begin = async (kind: Kind) => {
    const boxId =
      kind === "create" ? "B01" : kind === "conditional" ? "B02" : "B04";
    if (solved.current.has(boxId)) return;
    if (
      !active.current ||
      props.signal.aborted ||
      request.current?.kind === kind
    )
      return;
    request.current?.dispose();
    setPending(null);
    const operation =
      kind === "create"
        ? "publickey-credentials-create"
        : "publickey-credentials-get";
    if (
      !isSecureContext ||
      typeof PublicKeyCredential !== "function" ||
      !navigator.credentials ||
      typeof navigator.credentials[kind === "create" ? "create" : "get"] !==
        "function" ||
      window.top !== window ||
      !policyAllows(operation)
    ) {
      setStatus("unavailable");
      return;
    }
    if (
      document.visibilityState !== "visible" ||
      !document.hasFocus() ||
      navigator.userActivation?.isActive === false
    ) {
      setStatus("cancelled");
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    let issued = false;
    let expired = false;
    const current: Request = {
      kind,
      controller,
      dispose: () => {
        controller.abort();
        if (timer !== undefined) clearTimeout(timer);
        if (request.current === current) request.current = null;
      },
    };
    request.current = current;
    const valid = () =>
      active.current &&
      !props.signal.aborted &&
      !controller.signal.aborted &&
      request.current === current;
    setPending(kind);
    setStatus("waiting");
    timer = setTimeout(() => {
      if (!valid()) return;
      expired = true;
      current.dispose();
      setPending(null);
      setStatus("waitingEnded");
    }, waitLimit);
    try {
      let credential: Credential | null;
      if (kind === "create") {
        const promise = navigator.credentials.create({
          signal: controller.signal,
          publicKey: {
            challenge: randomBytes(),
            rp: { name: "Busycube", id: location.hostname },
            user: {
              id: randomBytes(16),
              name: `busycube-${crypto.randomUUID()}@local.invalid`,
              displayName: "Busycube player",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              residentKey: "required",
              userVerification: "preferred",
            },
            timeout: 120_000,
            attestation: "none",
          },
        });
        issued = true;
        credential = await promise;
      } else {
        if (kind === "conditional") {
          field.current?.focus();
          const available =
            await PublicKeyCredential.isConditionalMediationAvailable?.();
          if (!valid()) return;
          if (available !== true) {
            setStatus("unavailable");
            return;
          }
        }
        const promise = navigator.credentials.get({
          signal: controller.signal,
          mediation: kind === "conditional" ? "conditional" : "required",
          publicKey: {
            challenge: randomBytes(),
            rpId: location.hostname,
            allowCredentials: [],
            timeout: 120_000,
            userVerification: kind === "refusal" ? "required" : "preferred",
          },
        });
        issued = true;
        credential = await promise;
      }
      if (!valid()) return;
      if (
        !(credential instanceof PublicKeyCredential) ||
        credential.type !== "public-key"
      ) {
        setStatus("error");
        return;
      }
      if (kind !== "refusal") {
        const id = kind === "create" ? "B01" : "B02";
        if (!solved.current.has(id)) {
          solved.current.add(id);
          boxes.current[id].solve();
        }
        setStatus(kind === "create" ? "created" : "used");
      } else setStatus("used");
    } catch (error) {
      if (!valid()) return;
      const elapsed = performance.now() - started;
      if (
        kind === "refusal" &&
        document.visibilityState === "visible" &&
        issued &&
        !expired &&
        Number.isFinite(elapsed) &&
        elapsed >= 0 &&
        elapsed < waitLimit &&
        policyAllows(operation) &&
        error instanceof DOMException &&
        error.name === "NotAllowedError"
      ) {
        if (!solved.current.has("B04")) {
          solved.current.add("B04");
          boxes.current.B04.solve();
        }
        setStatus("denied");
      } else if (
        error instanceof DOMException &&
        ["NotSupportedError", "SecurityError"].includes(error.name)
      )
        setStatus("unavailable");
      else if (
        error instanceof DOMException &&
        ["NotAllowedError", "AbortError"].includes(error.name)
      )
        setStatus("cancelled");
      else setStatus("error");
    } finally {
      if (request.current === current) {
        current.dispose();
        if (active.current) setPending(null);
      }
    }
  };

  return (
    <div
      className="puzzle puzzle--centered s380-puzzle"
      data-pending={pending ?? "none"}
    >
      <div className="problem-row">
        <StageProblemGiftBox
          box={props.boxes.B01}
          locale={props.locale}
          onClick={() => void begin("create")}
        />
        <StageProblemGiftBox
          box={props.boxes.B02}
          locale={props.locale}
          onClick={() => void begin("conditional")}
        />
        <StageProblemGiftBox
          box={props.boxes.B04}
          locale={props.locale}
          onClick={() => void begin("refusal")}
        />
      </div>
      <form
        onSubmit={(event) => event.preventDefault()}
        className="s380-account"
      >
        <input
          ref={field}
          name="username"
          autoComplete="username webauthn"
          aria-label={stageText(props.locale, locale.passkeyAccount)}
        />
      </form>
      <p className="interaction-status" role="status">
        {status === "waitingEnded"
          ? stageText(props.locale, locale.waitingEnded)
          : statusText(props.locale, status)}
      </p>
      <p className="permission-note">
        {stageText(props.locale, locale.passkeyNote)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: { icon: KeyAdd, color: "#a78bfa", label: locale.B01 },
    [manifest.box.B02]: {
      icon: LockOpenOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B04]: {
      icon: KeyOffOutlined,
      color: "#fb7185",
      label: locale.B04,
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
  Component: S380Stage,
});
