import "./styles.css";
import AutorenewOutlined from "@mui/icons-material/AutorenewOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import PendingOutlined from "@mui/icons-material/PendingOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { isManualGoogleFedCm } from "./functions";
import { type GoogleId, loadIdentity } from "./identity";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-770
 * 目的: Google Identity Servicesの手動FedCM One Tapによる身分証の提示を一箱で扱う。
 * 最初の一手: 身分証の箱を押し、Googleとbrowserが管理する選択/同意UIで続行する。
 * 箱ごとの解法:
 * - B01「身分証」: 箱から今回のGoogle One Tapを開始し、browser所有のaccount UIを手動で完了する。auto_select falseで開始した現在generationの公式callbackが、非空のcredential文字列とselect_by fedcmを返すと開く。fedcm_auto/通常OAuth/別のselect_by・取消・空token・古いcallbackでは開かない。選択種別で箱を増やさない。
 * 使用API: FedCM/IdentityCredential、公式Google Identity Services initialize/prompt/cancelとSDKのscript読込。
 * 権限・privacy: tokenは非空確認だけに使い、decode・表示・console・storage・Drive・backendへ渡さず、account属性を取得しない。Google側の選択/同意UIは変更しない。明示取消/離脱は今回のpromptと読込待機を止める。
 * 対応環境: secureな公開originと登録済み専用Google Web client ID、Google account、FedCMを提供するbrowser。provider設定や実account選択は未観測として区別し、SDK読込や非FedCMの返却だけで達成にしない。
 */
function S770Stage(props: Props) {
  const generation = useRef(0);
  const live = useRef(true);
  const loader = useRef<AbortController | null>(null);
  const owner = useRef<GoogleId | null>(null);
  const solved = useRef(false);
  const [status, setStatus] = useState("idle");
  const clientId = import.meta.env.VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID?.trim();
  const stop = useCallback(() => {
    generation.current++;
    loader.current?.abort();
    loader.current = null;
    const current = owner.current;
    owner.current = null;
    try {
      current?.cancel();
    } catch {}
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
  const start = async () => {
    if (!live.current || props.signal.aborted) return;
    stop();
    if (!clientId) {
      setStatus("unconfigured");
      return;
    }
    if (!("IdentityCredential" in window)) {
      setStatus("unavailable");
      return;
    }
    const token = generation.current;
    const controller = new AbortController();
    loader.current = controller;
    const valid = () =>
      live.current &&
      !props.signal.aborted &&
      !controller.signal.aborted &&
      generation.current === token;
    setStatus("loading");
    try {
      const id = await loadIdentity(controller.signal);
      if (!valid()) return;
      owner.current = id;
      id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: (response) => {
          if (!valid()) return;
          generation.current++;
          owner.current = null;
          if (isManualGoogleFedCm(response)) {
            if (!solved.current) {
              solved.current = true;
              props.boxes.B01.solve();
            }
            setStatus("success");
          } else setStatus("invalid");
        },
      });
      if (!valid()) return;
      setStatus("waiting");
      id.prompt((notice) => {
        if (!valid()) return;
        // FedCM does not promise every One Tap moment notification. These are
        // optional cancellation hints; only the credential callback can win.
        if (notice.isDismissedMoment?.() || notice.isSkippedMoment?.()) {
          stop();
          setStatus("cancelled");
        }
      });
    } catch {
      if (valid()) {
        stop();
        setStatus("unavailable");
      }
    }
  };
  const busy = status === "loading" || status === "waiting";
  const label =
    status === "unconfigured"
      ? stageText(props.locale, locale.unconfigured)
      : statusText(props.locale, status === "loading" ? "running" : status);
  return (
    <div className="puzzle puzzle--centered s770-puzzle">
      <div className="s770-identity" aria-hidden="true">
        <BadgeOutlined />
      </div>
      <StageProblemGiftBox
        box={props.boxes.B01}
        locale={props.locale}
        onClick={() => void start()}
      />
      <div className="s770-state" role="status" aria-label={label}>
        <span className="sr-only">{label}</span>
        {status === "loading" ? (
          <AutorenewOutlined className="s770-loading" aria-hidden="true" />
        ) : status === "waiting" ? (
          <PendingOutlined aria-hidden="true" />
        ) : status === "success" ? (
          <CheckCircleOutlineOutlined aria-hidden="true" />
        ) : status === "idle" ? null : (
          <BlockOutlined aria-hidden="true" />
        )}
      </div>
      {busy ? (
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.cancel)}
          onClick={() => {
            if (live.current && !props.signal.aborted) {
              stop();
              setStatus("cancelled");
            }
          }}
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      ) : null}
      <p className="s770-privacy">{stageText(props.locale, locale.privacy)}</p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: { B01: { icon: BadgeOutlined, color: "#4285f4", label: locale.B01 } },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "IdentityCredential" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S770Stage,
});
