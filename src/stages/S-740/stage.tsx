import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useMemo, useState } from "react";
import { stageText } from "../locale";
import {
  deleteS740State,
  initialS740State,
  readS740State,
  S740_TAG,
  type S740State,
  writeS740Care,
} from "./functions";
import { locale } from "./locale";

type PeriodicSyncManagerLike = {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
};

type PeriodicRegistration = ServiceWorkerRegistration & {
  periodicSync?: PeriodicSyncManagerLike;
};

function publicUrl(path: string): string {
  return new URL(
    `periodic/${path}`,
    new URL(import.meta.env.BASE_URL, location.origin),
  ).href;
}

/**
 * S-740
 *
 * 目的: installed PWAのwindowが0件でもbrowser schedulerがService Workerを起動するPeriodic Background Syncを、二回の植物成長として確認する。
 * 最初の一手: 「温室を預ける」でtagを登録し、「水を預ける」を押してBusycubeの全windowを閉じ、browserによる実periodic syncを待つ。
 * 箱ごとの解法:
 * - B01「開花の箱」: client 0件のperiodicsyncでpending waterをphase 1へ進め、再訪してpending lightを預け、別のclientless eventでphase 2へ進める。再訪時にclientlessEventsが2以上かつCache Storageに`bloom.svg`があれば開く。
 * 使用API: Periodic Background Sync、Service Worker/Clients API、IndexedDB、Cache Storage、PWA installation。
 * 権限・privacy: 保存するのはphase、pending care種別、event countだけで、時刻・account・network・通知情報を保持しない。stage離脱後も長期ギミック用にlocal registration/stateを維持する。
 * 対応環境: 公開HTTPSでinstall済みPWAへPeriodic Background Syncを許可し、window 0件でもworkerを二回起動できるbrowser/OS。
 */
function S740Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const solveProblem = problem.solve;
  const [state, setState] = useState<S740State>(initialS740State);
  const [registered, setRegistered] = useState(false);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );
  const workerUrl = useMemo(() => publicUrl("periodic-sync-sw.js"), []);
  const scope = useMemo(() => publicUrl(""), []);
  const imageUrl = publicUrl(
    state.phase === 0
      ? "seed.svg"
      : state.phase === 1
        ? "sprout.svg"
        : "bloom.svg",
  );

  const getRegistration = async (): Promise<PeriodicRegistration> =>
    (await navigator.serviceWorker.register(workerUrl, {
      scope: new URL(scope).pathname,
      type: "module",
    })) as PeriodicRegistration;

  const inspect = useCallback(async () => {
    try {
      const next = await readS740State();
      setState(next);
      if (next.phase === 2 && next.clientlessEvents >= 2) {
        const cached = await caches.match(publicUrl("bloom.svg"));
        if (cached) {
          solveProblem();
          setStatus(stageText(props.locale, locale.bloom));
          return;
        }
      }
      if (next.phase === 1 && !next.pendingCare)
        setStatus(stageText(props.locale, locale.sprout));
      else if (next.pendingCare === "water")
        setStatus(stageText(props.locale, locale.waterLeft));
      else if (next.pendingCare === "light")
        setStatus(stageText(props.locale, locale.lightLeft));
      else setStatus(stageText(props.locale, locale.waiting));
    } catch {
      setStatus(stageText(props.locale, locale.failed));
    }
  }, [props.locale, solveProblem]);

  useEffect(() => {
    void inspect();
  }, [inspect]);

  const register = async () => {
    try {
      const registration = await getRegistration();
      if (!registration.periodicSync) {
        setStatus(stageText(props.locale, locale.unsupported));
        return;
      }
      await registration.periodicSync.register(S740_TAG, {
        minInterval: 24 * 60 * 60 * 1000,
      });
      setRegistered(true);
      setStatus(stageText(props.locale, locale.registered));
    } catch {
      setStatus(stageText(props.locale, locale.failed));
    }
  };

  const leaveCare = async (care: "water" | "light") => {
    try {
      const next = await writeS740Care(care);
      setState(next);
      setStatus(
        stageText(
          props.locale,
          care === "water" ? locale.waterLeft : locale.lightLeft,
        ),
      );
    } catch {
      setStatus(stageText(props.locale, locale.failed));
    }
  };

  const reset = async () => {
    try {
      const registration = (await navigator.serviceWorker.getRegistration(
        scope,
      )) as PeriodicRegistration | undefined;
      await registration?.periodicSync?.unregister(S740_TAG);
      await registration?.unregister();
      for (const key of await caches.keys()) {
        if (key.startsWith("busycube-s740-")) await caches.delete(key);
      }
      await deleteS740State();
      setState(initialS740State);
      setRegistered(false);
      setStatus(stageText(props.locale, locale.cleared));
    } catch {
      setStatus(stageText(props.locale, locale.failed));
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <img
        className="s740-plant"
        src={imageUrl}
        alt={stageText(props.locale, locale.imageAlt)}
        width={480}
        height={320}
      />
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          onClick={() => void register()}
        >
          {stageText(props.locale, locale.register)}
        </button>
        <button
          type="button"
          className="stage-action"
          disabled={
            !registered || state.phase !== 0 || Boolean(state.pendingCare)
          }
          onClick={() => void leaveCare("water")}
        >
          {stageText(props.locale, locale.water)}
        </button>
        <button
          type="button"
          className="stage-action"
          disabled={
            !registered || state.phase !== 1 || Boolean(state.pendingCare)
          }
          onClick={() => void leaveCare("light")}
        >
          {stageText(props.locale, locale.light)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => void inspect()}
        >
          {stageText(props.locale, locale.refresh)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => void reset()}
        >
          {stageText(props.locale, locale.reset)}
        </button>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: HourglassEmptyOutlined,
      color: "#4ade80",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "serviceWorker" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S740Stage,
});
