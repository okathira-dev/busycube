import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { stageText } from "../locale";
import {
  credentialKey,
  fromBase64Url,
  randomBytes,
  toBase64Url,
} from "../shared/webauthn";
import { locale } from "./locale";

/**
 * S-380
 *
 * 目的: discoverable passkeyの作成、conditional mediationでの利用成功、意図的に壊したcredential IDによる利用失敗を分けて観測する。
 * 最初の一手: 🔑でpasskeyを作成し、username欄から🔒のconditional UIでそのpasskeyを選ぶ。最後に⊘で不正IDの認証を試す。
 * 箱ごとの解法:
 * - B01「保存の箱」: resident key必須・user verification preferredで`navigator.credentials.create()`がPublicKeyCredentialを返し、そのrawIdをlocal保存すると開く。
 * - B02「利用成功の箱」: `mediation: "conditional"`の`credentials.get()`で任意のcredentialが正常に返ると開く。
 * - B03「利用失敗の箱」: 保存rawIdの先頭byteを反転したallowCredentials IDで認証し、`NotAllowedError`または`InvalidStateError`になれば開く。
 * 使用API: WebAuthn/Credential Management API、PublicKeyCredential、conditional mediation、Web Crypto random、localStorage。
 * 権限・privacy: authenticator UIで利用者確認を行い、attestationは`none`。localStorageにはcredential rawIdだけを保持し、秘密鍵・biometric・assertionを取得・送信しない。
 * 対応環境: secure contextでresident passkey作成とconditional WebAuthn認証を提供するbrowser、OS、authenticator。
 */
function S380Stage(props: Props) {
  const createBox = props.boxes[manifest.box.B01];
  const successBox = props.boxes[manifest.box.B02];
  const failureBox = props.boxes[manifest.box.B03];
  const [status, setStatus] = useState("");
  const create = async () => {
    try {
      const credential = (await navigator.credentials.create({
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
          timeout: 120000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;
      if (!credential || props.signal.aborted) return;
      localStorage.setItem(credentialKey, toBase64Url(credential.rawId));
      createBox.solve();
      setStatus("created");
    } catch (error) {
      if (!props.signal.aborted)
        setStatus(error instanceof DOMException ? error.name : "error");
    }
  };
  const requestConditional = async () => {
    try {
      const credential = await navigator.credentials.get({
        mediation: "conditional",
        publicKey: {
          challenge: randomBytes(),
          rpId: location.hostname,
          timeout: 120000,
          userVerification: "preferred",
        },
      });
      if (credential && !props.signal.aborted) {
        successBox.solve();
        setStatus("used");
      }
    } catch (error) {
      if (!props.signal.aborted)
        setStatus(error instanceof DOMException ? error.name : "error");
    }
  };
  const fail = async () => {
    try {
      const stored = localStorage.getItem(credentialKey);
      const wrong = stored
        ? fromBase64Url(stored).map((value, index) =>
            index === 0 ? value ^ 255 : value,
          )
        : randomBytes(32);
      await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(),
          rpId: location.hostname,
          allowCredentials: [{ type: "public-key", id: wrong }],
          timeout: 30000,
        },
      });
    } catch (error) {
      if (
        !props.signal.aborted &&
        error instanceof DOMException &&
        ["NotAllowedError", "InvalidStateError"].includes(error.name)
      ) {
        failureBox.solve();
        setStatus(error.name);
      }
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {[createBox, successBox, failureBox].map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <input
        className="passkey-field"
        autoComplete="username webauthn"
        aria-label={stageText(props.locale, locale.passkeyAccount)}
      />
      <div className="stage-actions">
        <button
          type="button"
          className="stage-action"
          onClick={() => void create()}
        >
          🔑
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => void requestConditional()}
        >
          🔒
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => void fail()}
        >
          ⊘
        </button>
      </div>
      <p className="interaction-status" role="status">
        {status
          ? `${stageText(props.locale, locale.browserError)}: ${status}`
          : null}
      </p>
      <p className="permission-note">
        {stageText(props.locale, locale.passkeyNote)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: FileUploadOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: LockOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: LockOutlined,
      color: "#fb7185",
      label: locale.B03,
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
