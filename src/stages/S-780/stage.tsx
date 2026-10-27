import "./styles.css";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import HighlightOffOutlined from "@mui/icons-material/HighlightOffOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
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
import { paymentSession } from "./payment";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-780
 * 目的: 架空BCUの実Payment Handlerで承認・拒否・再試行移行・対象財布の起動を四箱に分ける。
 * 最初の一手: 箱からbrowserの財布選択を開き、BCUとBusycube Walletの名前/ゲームロゴを見る。
 * 箱ごとの解法:
 * - B01「丸の中のチェック」: 財布の✓で承認する。今回のrequestIdとmethodに一致する実responseがapproved/accepted trueを返し、complete successが成功したときに開く。
 * - B02「丸の中のばつ」: 財布の×で拒否する。同様にdeclined/accepted falseとcomplete fail成功が揃うと開く。単なるbrowser取消は拒否へ読み替えない。
 * - B03「回転矢印」: 財布の↻で再試行を求め、実PaymentResponse.retry経路へ移る。retry呼出しが例外なくPromiseを返した後、同じrequestId/method/財布の別native PaymentRequestEventを厳密なWorker source/trusted/eventIdで受けると開く。ページ内clickやretry呼出し直前、Promise解決/二回目の承認は開箱条件にしない。決済処理の終了は別に待ち、取消/離脱で終える。
 * - B04「財布」: browser chooserでBusycube Walletを選ぶ。対象のexact Workerから今回のrequestId/methodとtrusted PaymentRequestEventに由来する新しいeventIdを受けた時点で開き、承認は要求しない。Pocket Walletや登録だけでは開かない。
 * 使用API: Payment Request/Response complete/retry/abort、Payment Handler Worker/PaymentRequestEvent/openWindow、PaymentManager.userHint、method/app manifest、実Service Worker message。
 * 権限・privacy: 自前の架空通貨BCU 1.00だけを使い、実決済・payer/送金/credentialを要求しない。wallet/request/eventの識別値はmemory内の試行照合だけに使い、保存/外部送信しない。
 * 対応環境: secure context、Payment Handlerと複数財布chooser、同retry内の再handlerイベントを提供するbrowser。登録/例外/未観測を成功へ変換せず、早期retryイベントの提供と残UIの終了は実環境確認事項として残す。
 */
function S780Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const session = useRef<ReturnType<typeof paymentSession> | null>(null);
  const [state, setState] = useState({ status: "idle", running: false });
  useEffect(() => {
    const current = paymentSession(
      props.signal,
      props.locale,
      (status, running) => setState({ status, running }),
      (id) => boxes.current[id].solve(),
    );
    session.current = current;
    return () => {
      current.dispose();
      if (session.current === current) session.current = null;
    };
  }, [props.signal, props.locale]);
  return (
    <div className="puzzle puzzle--centered s780-puzzle">
      <div className="s780-wallet">
        <img src="/icon.svg" alt="" width={64} height={64} />
        <span>Busycube Wallet</span>
        <span>BCU 1.00</span>
      </div>
      <div className="problem-row">
        {manifest.boxIds.map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
            onClick={() => void session.current?.begin()}
          />
        ))}
      </div>
      {state.running ? (
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.cancel)}
          onClick={() => session.current?.cancel()}
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      ) : null}
      <p role="status" className="interaction-status">
        {statusText(props.locale, state.status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: {
      icon: CheckCircleOutlineOutlined,
      color: "#facc15",
      label: locale.B01,
    },
    B02: { icon: HighlightOffOutlined, color: "#eab308", label: locale.B02 },
    B03: { icon: ReplayOutlined, color: "#ca8a04", label: locale.B03 },
    B04: {
      icon: AccountBalanceWalletOutlined,
      color: "#a16207",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "PaymentRequest" in window &&
      "serviceWorker" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S780Stage,
});
