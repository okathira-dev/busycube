import "./styles.css";
import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import SignalWifiOffOutlined from "@mui/icons-material/SignalWifiOffOutlined";
import { useEffect, useRef, useState } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-060
 *
 * 目的: 初回訪問とは別の再入場と、offline中に送ったbeaconをService Workerが受領した事実をそれぞれ確認する。
 * 最初の一手: 折り返す矢印を見て別stageへ移動し、このstageへ戻る。
 * 箱ごとの解法:
 * - B03「折り返す矢印」: 別stageへ移動してからこのstageへ戻る。同じdocument内のゲーム移動履歴で別stage経由の再訪が観測されると開く。reloadや一覧だけの往復では開かない。
 * - B02「斜線入りWi-Fi」: 点を押してonlineの受け口への移動を観察し、offlineで再び押す。実sendBeaconが受理されて点が画面外へ移り、再読み込み後に今回のnonceと一致するService Workerのoffline受領記録をIndexedDBから消費すると開く。
 * 使用API: ゲーム内stage移動履歴、`navigator.onLine`、online/offline event、Service Worker controller、`navigator.sendBeacon()`、IndexedDB、`location.assign()`、`crypto.randomUUID()`。
 * 権限・privacy: 権限を要求せず、一回限りのrandom nonceだけを保存する。receiptは成功判定時に削除し、beacon本文へ個人情報を含めない。
 * 対応環境: Service Workerに制御され、offline navigation・Beacon API・IndexedDBを利用できるsecure contextのbrowser。
 */
function S060Stage(props: Props) {
  const returnBox = props.boxes.B03;
  const beaconBox = props.boxes.B02;
  const [status, setStatus] = useState("");
  const [motion, setMotion] = useState<
    "origin" | "inside" | "outside" | "received"
  >("origin");
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [workerControlled, setWorkerControlled] = useState(() =>
    Boolean(navigator.serviceWorker?.controller),
  );
  const { arrival } = props.services;
  useEffect(() => {
    if (
      arrival?.stageId === manifest.id &&
      arrival.revisit &&
      !props.signal.aborted
    )
      returnBox.solve();
  }, [arrival, returnBox.solve, props.signal]);

  useEffect(() => {
    const nonce = new URL(window.location.href).searchParams.get(
      "offline-beacon",
    );
    if (!nonce || !("indexedDB" in window)) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retry = () => {
      if (!active || props.signal.aborted) return;
      attempts += 1;
      if (attempts < 20) timer = setTimeout(inspect, 500);
      else setStatus(stageText(props.locale, locale.receiptUnavailable));
    };
    const inspect = () => {
      if (!active || props.signal.aborted) return;
      const request = indexedDB.open("busycube-offline-beacon", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("receipts", { keyPath: "nonce" });
      };
      request.onerror = retry;
      request.onsuccess = () => {
        const database = request.result;
        if (!active || props.signal.aborted) {
          database.close();
          return;
        }
        const transaction = database.transaction("receipts", "readwrite");
        const store = transaction.objectStore("receipts");
        const lookup = store.get(nonce);
        let received = false;
        lookup.onsuccess = () => {
          if (!active || props.signal.aborted || lookup.result?.nonce !== nonce)
            return;
          received = true;
          store.delete(nonce);
        };
        transaction.oncomplete = () => {
          database.close();
          if (!active || props.signal.aborted) return;
          if (!received) {
            retry();
            return;
          }
          setMotion("received");
          beaconBox.solve();
          const url = new URL(window.location.href);
          url.searchParams.delete("offline-beacon");
          window.history.replaceState(window.history.state, "", url);
        };
        transaction.onabort = () => {
          database.close();
          retry();
        };
      };
    };
    inspect();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [beaconBox.solve, props.locale, props.signal]);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    const handleController = () =>
      setWorkerControlled(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleController,
    );
    return () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleController,
      );
    };
  }, []);

  const sendBeacon = () => {
    if (props.signal.aborted || motion === "outside") return;
    if (!offline) {
      setMotion(motion === "inside" ? "origin" : "inside");
      return;
    }
    if (!workerControlled) {
      setStatus(stageText(props.locale, locale.waitingWorker));
      return;
    }
    const nonce = crypto.randomUUID();
    const payload = new Blob([JSON.stringify({ nonce })], {
      type: "application/json",
    });
    const accepted = navigator.sendBeacon(
      new URL("./offline-beacon/receipt", window.location.href),
      payload,
    );
    if (!accepted) {
      setStatus(stageText(props.locale, locale.rejected));
      return;
    }
    setMotion("outside");
    const receiver = new URL("./", window.location.href);
    receiver.searchParams.set("stage", manifest.id);
    receiver.searchParams.set("offline-beacon", nonce);
    navigationTimer.current = setTimeout(() => {
      if (!props.signal.aborted) window.location.assign(receiver);
    }, 700);
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="beacon-path" data-motion={motion}>
        <span className="beacon-path__receiver" aria-hidden="true" />
        <button
          type="button"
          className="beacon-path__point"
          aria-label={stageText(props.locale, locale.point)}
          onClick={sendBeacon}
          disabled={motion === "outside"}
        />
      </div>
      <p className="interaction-status" role="status">
        {status}
      </p>
      <div className="problem-row">
        <StageProblemGiftBox box={returnBox} locale={props.locale} />
        <StageProblemGiftBox box={beaconBox} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: KeyboardReturnOutlined,
      tone: "violet",
      label: locale.B03,
    },
    [manifest.box.B02]: {
      icon: SignalWifiOffOutlined,
      tone: "cyan",
      label: locale.B02,
    },
  },
  Component: S060Stage,
});
