import "./styles.css";
import FilterNoneOutlined from "@mui/icons-material/FilterNoneOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { useEffect, useRef, useState } from "react";
import { messages } from "../../i18n";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { appUrlForView } from "../../ui/appRoute";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-140
 * 目的: 別の保存環境で作られた進捗データを今回のGoogle Drive同期で取得する。
 * 最初の一手: 同じBusycubeの印を持つ二画面と共有の雲を手掛かりに、同じGoogleアカウントへ別環境から進捗を同期し、手元の箱を押す。接続設定は共通設定で扱う。
 * 箱ごとの解法:
 * - B02「重なる二つの枠」: 別環境の進捗を同じDriveへ同期した後、箱から新たに同期する。実serviceの返却がsynced === trueかつremoteDevice === true、つまり読み取った有効な進捗の非空installationIdが手元のIDと異なる場合だけ開く。同一環境だけの同期や過去のローカル達成では今回の箱を開かない。
 * 使用API: Google Identity ServicesとDrive appDataFolderを使うruntimeのdrive.sync。installationIdはゲームが乱数で発行する保存環境のIDであり、Drive発行の物理端末IDやUA比較ではない。
 * 権限・privacy: 箱の操作からGoogle認証/Drive app dataの同意へ進む。stageには新しい同期結果のbooleanだけを渡し、ID/アカウント/remote本文を表示・追加保存・送信しない。共通同期は手元のinstallationIdと設定を維持する。
 * 対応環境: Google連携が設定され、同じGoogleアカウントへの認証とDrive通信を利用できるbrowser。同じPCの別profile/browserも別保存環境になり得る。
 */
function S140Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const [status, setStatus] = useState<CommonStatus>("idle");
  const [matched, setMatched] = useState(false);
  const active = useRef(true);
  const pending = useRef(false);
  const solved = useRef(false);
  const drive = props.services.drive;
  useEffect(() => {
    active.current = !props.signal.aborted;
    const stop = () => {
      active.current = false;
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      stop();
      props.signal.removeEventListener("abort", stop);
    };
  }, [props.signal]);

  const sync = async () => {
    if (
      !active.current ||
      props.signal.aborted ||
      !drive?.configured ||
      pending.current ||
      solved.current
    )
      return;
    pending.current = true;
    setStatus("syncing");
    try {
      const result = await drive.sync();
      if (!active.current || props.signal.aborted) return;
      if (result.synced !== true) {
        setStatus("error");
        return;
      }
      if (result.remoteDevice === true) {
        solved.current = true;
        setMatched(true);
        problem.solve();
        setStatus("matched");
      } else setStatus("success");
    } catch {
      if (active.current && !props.signal.aborted) setStatus("error");
    } finally {
      pending.current = false;
    }
  };

  return (
    <div
      className="puzzle puzzle--centered s140-puzzle"
      data-matched={matched}
      aria-busy={status === "syncing"}
    >
      <svg className="s140-link" viewBox="0 0 460 230" aria-hidden="true">
        <path
          className="s140-link__wire"
          d="M100 125 V56 H186 M274 56 H360 V125"
        />
        <path
          className="s140-link__cloud"
          d="M195 76 C171 76 168 44 187 37 C189 12 223 9 233 29 C257 15 282 35 276 54 C294 72 277 87 259 80 H195Z"
        />
        <rect
          className="s140-link__screen"
          x="24"
          y="118"
          width="152"
          height="100"
          rx="9"
        />
        <rect
          className="s140-link__screen"
          x="284"
          y="118"
          width="152"
          height="100"
          rx="9"
        />
        <path className="s140-link__bar" d="M24 136 H176 M284 136 H436" />
        <image href="/icon.svg" x="76" y="150" width="48" height="48" />
        <image href="/icon.svg" x="336" y="150" width="48" height="48" />
        <image
          className="s140-link__arrival"
          visibility={matched ? "visible" : "hidden"}
          href="/icon.svg"
          x="76"
          y="150"
          width="48"
          height="48"
        />
      </svg>
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => void sync()}
      />
      <p role="status" className="interaction-status">
        {!drive?.configured
          ? stageText(props.locale, locale.driveNotConfigured)
          : statusText(props.locale, status)}
      </p>
      <a
        className="s140-settings"
        href={appUrlForView(location.href, "settings")}
        aria-label={messages[props.locale].settings}
      >
        <SettingsOutlined aria-hidden="true" />
      </a>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: FilterNoneOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
  },
  probe: () => "available",
  Component: S140Stage,
});
