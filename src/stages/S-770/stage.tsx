import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
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
import { type GoogleFedCmResult, isManualGoogleFedCm } from "./functions";
import { locale } from "./locale";

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        auto_select: false;
        callback(response: GoogleFedCmResult): void;
      }): void;
      prompt(): void;
      cancel(): void;
    };
  };
};

let googleScriptPromise: Promise<void> | undefined;

function loadGoogleIdentityServices(): Promise<void> {
  if ((window as Window & { google?: GoogleIdentityServices }).google)
    return Promise.resolve();
  googleScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      googleScriptPromise = undefined;
      reject(new Error("Google Identity Services failed"));
    };
    document.head.append(script);
  });
  return googleScriptPromise;
}

/**
 * S-770
 *
 * 目的: 通常OAuthではなく、Google managed IdPとbrowserが仲介するFedCM account chooserで利用者が一度だけ手動Continueする。
 * 最初の一手: 公開origin用Google FedCM client IDを設定し、「Googleの身分証を提示」を押してbrowser所有account UIから手動で続行する。
 * 箱ごとの解法:
 * - B01「手動FedCMの箱」: current generationのGoogle Identity Services callbackが非空`credential`と厳密な`select_by === "fedcm"`を返すと開く。
 * 使用API: FedCM/IdentityCredential、公式Google Identity Services JavaScript APIのinitialize/prompt/cancel、外部GIS script load。
 * 権限・privacy: callback tokenは非空判定だけ行い、decode・表示・console・storage・Drive・analytics・backendへ渡さない。account属性を取得しない。
 * 対応環境: secureな公開origin、登録済み専用Google Web client ID、online Google account、FedCM/IdentityCredential対応browser。
 */
function S770Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const generationRef = useRef(0);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );
  const clientId = import.meta.env.VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID as
    | string
    | undefined;

  useEffect(() => {
    const stop = () => {
      generationRef.current += 1;
      (
        window as Window & { google?: GoogleIdentityServices }
      ).google?.accounts.id.cancel();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const startGoogle = async () => {
    if (!clientId) {
      setStatus(stageText(props.locale, locale.unconfigured));
      return;
    }
    if (!("IdentityCredential" in window)) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setStatus(stageText(props.locale, locale.loading));
    try {
      await loadGoogleIdentityServices();
      const google = (window as Window & { google?: GoogleIdentityServices })
        .google;
      if (!google) throw new Error("Google Identity Services unavailable");
      google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: (response) => {
          if (generationRef.current !== generation) return;
          const manualFedCm = isManualGoogleFedCm(response);
          if (manualFedCm) {
            problem.solve();
            setStatus(stageText(props.locale, locale.success));
          } else {
            setStatus(stageText(props.locale, locale.rejected));
          }
        },
      });
      setStatus(stageText(props.locale, locale.waiting));
      google.accounts.id.prompt();
    } catch {
      setStatus(stageText(props.locale, locale.unavailable));
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void startGoogle()}
      >
        {stageText(props.locale, locale.startGoogle)}
      </button>
      <p>{stageText(props.locale, locale.privacy)}</p>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SelectAllOutlined,
      color: "#4285f4",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "IdentityCredential" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S770Stage,
});
