import "./stage.css";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import ContentPasteOutlined from "@mui/icons-material/ContentPasteOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import ScreenRotationOutlined from "@mui/icons-material/ScreenRotationOutlined";
import SensorsOutlined from "@mui/icons-material/SensorsOutlined";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  available,
  keys,
  type PermissionKey,
  type PermissionValue,
  queryPermission,
  requestPermission,
} from "./permissions";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const ids = {
  geolocation: manifest.box.B01,
  notifications: manifest.box.B02,
  camera: manifest.box.B03,
  microphone: manifest.box.B04,
  accelerometer: manifest.box.B05,
  gyroscope: manifest.box.B06,
  "local-fonts": manifest.box.B07,
  "clipboard-read": manifest.box.B08,
  "idle-detection": manifest.box.B09,
  "clipboard-write": manifest.box.B10,
};
const initialStates = (): Record<PermissionKey, PermissionValue> => ({
  geolocation: "unknown",
  notifications: "unknown",
  camera: "unknown",
  microphone: "unknown",
  accelerometer: "unknown",
  gyroscope: "unknown",
  "local-fonts": "unknown",
  "clipboard-read": "unknown",
  "idle-detection": "unknown",
  "clipboard-write": "unknown",
});
function stateText(language: Props["locale"], state: PermissionValue) {
  return state === "unknown"
    ? stageText(language, locale.unknown)
    : statusText(language, state);
}
function failure(error: unknown): CommonStatus {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError")
      return "denied";
    if (
      error.name === "NotFoundError" ||
      error.name === "NotSupportedError" ||
      error.name === "NotReadableError"
    )
      return "unavailable";
    if (error.name === "AbortError") return "cancelled";
  }
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === 1) return "denied";
    if (error.code === 2) return "unavailable";
  }
  return "error";
}

/**
 * S-650
 *
 * 目的: 十種類の権限を明示操作で確認し、Permissions APIが実際に返すgrantedを各箱へ対応させる。
 * 最初の一手: 各権限の状態を見て対応buttonから許可を要求する。既に許可済みなら初期queryで開く。順序は問わない。
 * 箱ごとの解法:
 * - B01「点を結ぶ道」: 位置情報のbuttonから許可し、geolocationのPermissionStatus.stateがgrantedなら開く。
 * - B02「ベル」: 通知のbuttonから許可し、notificationsのstateがgrantedなら開く。
 * - B03「二つの画面」: カメラのbuttonから許可し、cameraのstateがgrantedなら開く。
 * - B04「音波の出るスピーカー」: マイクのbuttonから許可し、microphoneのstateがgrantedなら開く。
 * - B05「センサー」: 加速度のbuttonから許可し、accelerometerのstateがgrantedなら開く。
 * - B06「回る端末」: ジャイロのbuttonから許可し、gyroscopeのstateがgrantedなら開く。
 * - B07「文字」: 取得して破棄する説明を読んでフォントのbuttonを押し、local-fontsのstateがgrantedなら開く。
 * - B08「クリップボード」: 読み取って破棄する説明を読んで読み取りのbuttonを押し、clipboard-readのstateがgrantedなら開く。
 * - B09「砂時計」: アイドル検出のbuttonから許可し、idle-detectionのstateがgrantedなら開く。実際の離席監視は始めない。
 * - B10「二枚の紙」: 未許可ならサイト設定を変更して再確認し、clipboard-writeのstateがgrantedなら開く。許可確認のための書き込みは行わない。
 * 使用API: Permissions.queryとPermissionStatus.change、Geolocation.watchPosition、Notification.requestPermission、getUserMedia、Accelerometer/Gyroscope.start、queryLocalFonts、Clipboard.readText、IdleDetector.requestPermission。要求の戻り値や取得成功はgrantedの代替にしない。
 * 権限・privacy: 取得を伴う要求は明示button後だけに行い、既にgrantedなら再取得しない。位置は読まずwatchを解除、mediaの全trackとsensorは直ちに停止する。取得したfont/clipboard結果を表示・保持・保存・送信せず破棄し、clipboardを上書きしない。権限状態は現在値だけをmemoryに持つ。
 * 対応環境: secure contextで各APIと対応permission nameのqueryを提供するbrowser。未対応/確認不能は未達とし、権限を他機能の利用保証とは扱わない。
 */
function S650Stage(props: Props) {
  const [states, setStates] = useState(initialStates);
  const [busy, setBusy] = useState<ReadonlySet<PermissionKey>>(() => new Set());
  const [status, setStatus] = useState("");
  const alive = useRef(false);
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const solved = useRef(new Set<PermissionKey>());
  const revisions = useRef(new Map<PermissionKey, number>());
  const observed = useRef(
    new Map<
      PermissionKey,
      { permission: PermissionStatus; listener: () => void }
    >(),
  );
  const requests = useRef(new Map<PermissionKey, AbortController>());
  const observe = useCallback(
    async (key: PermissionKey): Promise<PermissionValue> => {
      if (!alive.current || props.signal.aborted) return "unknown";
      const revision = (revisions.current.get(key) ?? 0) + 1;
      revisions.current.set(key, revision);
      const detach = () => {
        const prior = observed.current.get(key);
        if (prior)
          prior.permission.removeEventListener("change", prior.listener);
        observed.current.delete(key);
      };
      const update = (state: PermissionValue) => {
        if (
          !alive.current ||
          props.signal.aborted ||
          revisions.current.get(key) !== revision
        )
          return;
        setStates((previous) => ({ ...previous, [key]: state }));
        if (state === "granted" && !solved.current.has(key)) {
          solved.current.add(key);
          boxes.current[ids[key]].solve();
          requests.current.get(key)?.abort();
        }
      };
      try {
        if (!available(key)) {
          detach();
          update("unavailable");
          return "unavailable";
        }
        const permission = await queryPermission(key);
        if (
          !alive.current ||
          props.signal.aborted ||
          revisions.current.get(key) !== revision
        )
          return "unknown";
        detach();
        const listener = () => update(permission.state);
        observed.current.set(key, { permission, listener });
        permission.addEventListener("change", listener);
        update(permission.state);
        return permission.state;
      } catch {
        if (alive.current && revisions.current.get(key) === revision) {
          detach();
          update("unknown");
        }
        return "unknown";
      }
    },
    [props.signal],
  );
  useEffect(() => {
    alive.current = !props.signal.aborted;
    const refresh = () => {
      if (alive.current) for (const key of keys) void observe(key);
    };
    const dispose = () => {
      alive.current = false;
      for (const { permission, listener } of observed.current.values())
        permission.removeEventListener("change", listener);
      observed.current.clear();
      for (const controller of requests.current.values()) controller.abort();
      requests.current.clear();
    };
    refresh();
    window.addEventListener("focus", refresh);
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      window.removeEventListener("focus", refresh);
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [observe, props.signal]);
  const request = async (key: PermissionKey) => {
    if (!alive.current || props.signal.aborted || requests.current.has(key))
      return;
    const permission = observed.current.get(key)?.permission;
    if (!permission || permission.state === "granted") {
      await observe(key);
      return;
    }
    const controller = new AbortController();
    requests.current.set(key, controller);
    setBusy((previous) => new Set([...previous, key]));
    let result: CommonStatus = "prompt";
    try {
      await requestPermission(key, controller.signal);
    } catch (error) {
      result = failure(error);
    } finally {
      if (requests.current.get(key) === controller)
        requests.current.delete(key);
      const current = await observe(key);
      if (alive.current && !props.signal.aborted) {
        setBusy((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
        setStatus(
          `${stageText(props.locale, locale[key])}: ${current === "granted" || current === "denied" ? stateText(props.locale, current) : statusText(props.locale, result)}`,
        );
      }
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <div className="s650-permissions">
        {keys.map((key) => (
          <section
            className="s650-permission"
            data-permission={key}
            key={key}
            aria-label={stageText(props.locale, locale[key])}
          >
            <h3>{stageText(props.locale, locale[key])}</h3>
            <StageProblemGiftBox
              box={props.boxes[ids[key]]}
              locale={props.locale}
            />
            {key === "local-fonts" ? (
              <p className="s650-note">
                {stageText(props.locale, locale.fontsNotice)}
              </p>
            ) : null}
            {key === "clipboard-read" ? (
              <p className="s650-note">
                {stageText(props.locale, locale.clipboardNotice)}
              </p>
            ) : null}
            {key === "clipboard-write" ? (
              <p className="s650-note">
                {stageText(props.locale, locale.writeNotice)}
              </p>
            ) : null}
            <p>{stateText(props.locale, states[key])}</p>
            <button
              type="button"
              className="stage-action"
              disabled={
                busy.has(key) ||
                states[key] === "granted" ||
                states[key] === "unavailable"
              }
              onClick={() => void request(key)}
              aria-label={`${stageText(props.locale, locale[key])}: ${stageText(props.locale, key === "clipboard-write" || states[key] === "unknown" ? locale.recheck : locale.request)}`}
            >
              {stageText(
                props.locale,
                key === "clipboard-write" || states[key] === "unknown"
                  ? locale.recheck
                  : locale.request,
              )}
            </button>
          </section>
        ))}
      </div>
      <p className="s650-note">
        {stageText(props.locale, locale.settingsNotice)}
      </p>
      <p className="interaction-status" role="status">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#22c55e",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: NotificationsOutlined,
      color: "#16a34a",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: DesktopWindowsOutlined,
      color: "#15803d",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: VolumeUpOutlined,
      color: "#166534",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: SensorsOutlined,
      tone: "rose",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: ScreenRotationOutlined,
      tone: "green",
      label: locale.B06,
    },
    [manifest.box.B07]: {
      icon: TextFieldsOutlined,
      tone: "violet",
      label: locale.B07,
    },
    [manifest.box.B08]: {
      icon: ContentPasteOutlined,
      tone: "cyan",
      label: locale.B08,
    },
    [manifest.box.B09]: {
      icon: HourglassEmptyOutlined,
      tone: "amber",
      label: locale.B09,
    },
    [manifest.box.B10]: {
      icon: ContentCopyOutlined,
      tone: "blue",
      label: locale.B10,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "permissions" in navigator ? "permission-required" : "unsupported",
    ),
  Component: S650Stage,
});
