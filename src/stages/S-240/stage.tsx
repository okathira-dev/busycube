import "./styles.css";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import MoveToInboxOutlined from "@mui/icons-material/MoveToInboxOutlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import { useEffect, useRef, useState } from "react";
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
import { consumeReturnedShare, prepareShareAttempt } from "./shareReceipt";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-240
 *
 * 目的: 挑戦ごとの印をOSの共有先へ渡し、installed Busycubeへ共有し直して受け取る。
 * 最初の一手: 中央の共有アイコンを押して、ゲーム用の一時印をメモ等へ渡す。
 * 箱ごとの解法:
 * - B03「受信箱」: 外へ渡した印を変更せず、別appのOS共有からinstalled Busycubeを選んで戻す。ManifestのPOST share_targetで受けた本文から今回のUUID印を抽出し、同originのpending挑戦と厳密一致した受取記録をtransactionで一度だけ消費すると開く。共有promiseの正常終了だけでは開かない。
 * 使用API: Web Share、Manifest share_target、Worker POST、IndexedDB、Web Crypto UUID。
 * 権限・privacy: 明示操作で共有sheetを開き、外へ渡すのはゲーム用の一時印だけ。受信本文はWorkerで最大64KiBに制限し、印以外を記録・転送せず、一時印の状態を同originの一slotだけ保持する。
 * 対応環境: secure contextのWeb Shareと、Busycubeをinstallしてshare targetにできるbrowser/OS。同originのstorageが必要。Web APIで送信元appの身元を証明するものではない。
 */
function S240Stage(props: Props) {
  const problem = props.boxes[manifest.box.B03];
  const [nonce, setNonce] = useState<string>();
  const [status, setStatus] = useState("");
  const active = useRef(false);
  const sharing = useRef(false);
  const solved = useRef(false);
  useEffect(() => {
    active.current = true;
    const cleanUrl = new URL(location.href);
    for (const key of ["share-target", "title", "text", "url"])
      cleanUrl.searchParams.delete(key);
    if (cleanUrl.href !== location.href)
      history.replaceState(history.state, "", cleanUrl);
    const controller = new AbortController();
    const abort = () => {
      active.current = false;
      controller.abort();
    };
    props.signal.addEventListener("abort", abort, { once: true });
    let checking = false;
    const check = async () => {
      if (checking || controller.signal.aborted || solved.current) return;
      checking = true;
      try {
        if (await consumeReturnedShare(controller.signal)) {
          if (controller.signal.aborted) return;
          solved.current = true;
          problem.solve();
          setNonce(undefined);
          setStatus("success");
        } else {
          const mark = await prepareShareAttempt(
            props.locale,
            controller.signal,
          );
          if (!controller.signal.aborted) setNonce(mark);
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      } finally {
        checking = false;
      }
    };
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      props.signal.removeEventListener("abort", abort);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      abort();
    };
  }, [props.signal, props.locale, problem.solve]);
  const share = async () => {
    if (
      !nonce ||
      sharing.current ||
      solved.current ||
      !active.current ||
      props.signal.aborted
    )
      return;
    if (!navigator.share) {
      setStatus("unavailable");
      return;
    }
    sharing.current = true;
    try {
      await navigator.share({
        title: "Busycube",
        text: `busycube:S240:${nonce}`,
      });
      if (active.current && !props.signal.aborted && !solved.current)
        setStatus("waiting");
    } catch (error) {
      if (active.current && !props.signal.aborted && !solved.current)
        setStatus(
          error instanceof DOMException && error.name === "AbortError"
            ? "cancelled"
            : error instanceof DOMException && error.name === "NotAllowedError"
              ? "denied"
              : "error",
        );
    } finally {
      sharing.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <button
        type="button"
        className="stage-action s240-share"
        disabled={!nonce || solved.current}
        aria-label={stageText(props.locale, locale.share)}
        onClick={() => void share()}
      >
        <ShareOutlined fontSize="large" />
      </button>
      <p className="s240-install">
        <InstallDesktopOutlined />
        {stageText(props.locale, locale.install)}
      </p>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: MoveToInboxOutlined,
      color: "#34d399",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "share" in navigator ? "permission-required" : "unsupported",
    ),
  Component: S240Stage,
});
