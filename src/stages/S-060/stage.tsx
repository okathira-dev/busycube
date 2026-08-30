import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import SignalWifiOffOutlined from "@mui/icons-material/SignalWifiOffOutlined";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { hasRevisitFlag, setRevisitFlag } from "../../infra/synchronousFlags";
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
 * 最初の一手: いったん別stageへ移動して戻りB01を開く。B02はworker制御下で端末をofflineにして「投函する」を押す。
 * 箱ごとの解法:
 * - B01「再訪の箱」: 初回入場で`entered` markerと同期flagを記録し、後の入場開始時点でどちらかが既に存在すれば開く。
 * - B02「オフライン投函の箱」: offlineかつService Worker制御中に生成したnonceを`sendBeacon`で投函し、遷移後の`offline-beacon` queryとIndexedDBの`receipts`に同じnonceの受領記録があれば、そのrecordを消費して開く。
 * 使用API: stage進捗marker、同期revisit flag、`navigator.onLine`、online/offline event、Service Worker controller、`navigator.sendBeacon()`、IndexedDB、`location.assign()`、`crypto.randomUUID()`。
 * 権限・privacy: 権限を要求せず、再訪flagと一回限りのrandom nonceだけを保存する。receiptは成功判定時に削除し、beacon本文へ個人情報を含めない。
 * 対応環境: Service Workerに制御され、offline navigation・Beacon API・IndexedDBを利用できるsecure contextのbrowser。
 */
function S060Stage(props: Props) {
  const returnBox = props.boxes.B01;
  const beaconBox = props.boxes.B02;
  const [status, setStatus] = useState("");
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [workerControlled, setWorkerControlled] = useState(() =>
    Boolean(navigator.serviceWorker.controller),
  );
  const seenBefore = useRef(
    props.progress.hasMarker("entered") || hasRevisitFlag(),
  );

  useLayoutEffect(() => {
    if (!seenBefore.current) {
      setRevisitFlag();
      props.progress.mark("entered");
    }
  }, [props.progress]);

  useEffect(() => {
    if (seenBefore.current) returnBox.solve();
  }, [returnBox.solve]);

  useEffect(() => {
    const nonce = new URL(window.location.href).searchParams.get(
      "offline-beacon",
    );
    if (!nonce || !("indexedDB" in window)) return;
    const request = indexedDB.open("busycube-offline-beacon", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("receipts", { keyPath: "nonce" });
    };
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("receipts", "readwrite");
      const lookup = transaction.objectStore("receipts").get(nonce);
      lookup.onsuccess = () => {
        if (!lookup.result) {
          setStatus(stageText(props.locale, locale.receiptUnavailable));
          database.close();
          return;
        }
        transaction.objectStore("receipts").delete(nonce);
        beaconBox.solve();
        setStatus(stageText(props.locale, locale.receiptConsumed));
      };
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    };
    request.onerror = () =>
      setStatus(stageText(props.locale, locale.receiptUnavailable));
  }, [beaconBox.solve, props.locale]);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    const handleController = () => setWorkerControlled(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleController,
    );
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleController,
      );
    };
  }, []);

  const sendBeacon = () => {
    if (!offline || !workerControlled) {
      setStatus(
        stageText(
          props.locale,
          !workerControlled ? locale.waitingWorker : locale.needOffline,
        ),
      );
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
    setStatus(stageText(props.locale, locale.accepted));
    const receiver = new URL("./", window.location.href);
    receiver.searchParams.set("stage", manifest.id);
    receiver.searchParams.set("offline-beacon", nonce);
    window.location.assign(receiver);
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="return-clue" aria-hidden="true">
        ↪
      </div>
      <p>{stageText(props.locale, locale.revisitClue)}</p>
      <div className="stage-actions">
        <button
          type="button"
          className="stage-action"
          onClick={sendBeacon}
          disabled={!offline || !workerControlled}
        >
          {stageText(props.locale, locale.post)}
        </button>
      </div>
      <p className="interaction-status" role="status">
        {status ||
          stageText(
            props.locale,
            !workerControlled
              ? locale.waitingWorker
              : offline
                ? locale.readyOffline
                : locale.needOffline,
          )}
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
    [manifest.box.B01]: {
      icon: KeyboardReturnOutlined,
      tone: "violet",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: SignalWifiOffOutlined,
      tone: "cyan",
      label: locale.B02,
    },
  },
  Component: S060Stage,
});
