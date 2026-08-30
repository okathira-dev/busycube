import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type PermissionKey = "geolocation" | "notifications" | "camera" | "microphone";
type PermissionValue = PermissionState | "unknown";

function permissionStateText(
  currentLocale: Props["locale"],
  state: PermissionValue,
) {
  return state === "unknown"
    ? stageText(currentLocale, locale.unknown)
    : statusText(currentLocale, state);
}

const keys: readonly PermissionKey[] = [
  "geolocation",
  "notifications",
  "camera",
  "microphone",
];

function permissionLabel(key: PermissionKey, currentLocale: Props["locale"]) {
  return stageText(currentLocale, locale[key]);
}

/**
 * S-650
 *
 * 目的: 位置情報・通知・camera・microphoneの許可要求結果ではなく、Permissions APIが報告する最終`granted`状態を4箱へ対応づける。
 * 最初の一手: 各buttonを押してbrowser標準permission UIで許可し、button横の状態が`granted`へ変わるのを待つ。
 * 箱ごとの解法:
 * - B01「位置情報許可の箱」: `permissions.query({name:"geolocation"})`の初期stateまたはchange後stateが`granted`なら開く。
 * - B02「通知許可の箱」: `permissions.query({name:"notifications"})`のPermissionStatusが`granted`なら開く。
 * - B03「カメラ許可の箱」: `permissions.query({name:"camera"})`のPermissionStatusが`granted`なら開く。
 * - B04「マイク許可の箱」: `permissions.query({name:"microphone"})`のPermissionStatusが`granted`なら開く。
 * 使用API: Permissions API/PermissionStatus change、Geolocation `getCurrentPosition()`、Notifications permission、MediaDevices `getUserMedia()`。
 * 権限・privacy: 各権限は対応buttonからだけ要求する。位置結果は捨て、camera/microphone streamは取得直後に全trackをstopし、位置・音声・映像・状態履歴を保存・送信しない。
 * 対応環境: secure contextでPermissions APIが四つのpermission nameをqueryでき、各標準permission promptを提供するbrowser。
 */
function S650Stage(props: Props) {
  const problems = [
    props.boxes.B01,
    props.boxes.B02,
    props.boxes.B03,
    props.boxes.B04,
  ] as const;
  const [states, setStates] = useState<Record<PermissionKey, PermissionValue>>(
    () =>
      Object.fromEntries(keys.map((key) => [key, "unknown"])) as Record<
        PermissionKey,
        PermissionValue
      >,
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    const statusObjects: PermissionStatus[] = [];
    const listeners = new Map<PermissionStatus, () => void>();
    const refresh = (key: PermissionKey, permission: PermissionStatus) => {
      if (!active) return;
      setStates((previous) => ({ ...previous, [key]: permission.state }));
      const handleChange = () => {
        if (!active) return;
        setStates((previous) => ({ ...previous, [key]: permission.state }));
      };
      listeners.set(permission, handleChange);
      permission.addEventListener("change", handleChange);
    };
    void Promise.all(
      keys.map(async (key) => {
        try {
          const permission = await navigator.permissions.query({
            name: key as PermissionName,
          });
          statusObjects.push(permission);
          refresh(key, permission);
        } catch {
          if (active)
            setStates((previous) => ({ ...previous, [key]: "unknown" }));
        }
      }),
    );
    return () => {
      active = false;
      for (const permission of statusObjects) {
        const handleChange = listeners.get(permission);
        if (handleChange)
          permission.removeEventListener("change", handleChange);
      }
      listeners.clear();
    };
  }, []);

  useEffect(() => {
    for (const [index, key] of keys.entries()) {
      if (states[key] === "granted") problems[index]?.solve();
    }
  }, [problems, states]);

  const request = async (key: PermissionKey) => {
    try {
      if (key === "geolocation") {
        await new Promise<void>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (error) => reject(error),
            { maximumAge: 0, timeout: 10_000 },
          ),
        );
      } else if (key === "notifications") {
        if ("Notification" in window) await Notification.requestPermission();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: key === "camera",
          audio: key === "microphone",
        });
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      setStatus(
        `${permissionLabel(key, props.locale)}: ${stageText(props.locale, locale.requested)}`,
      );
    } catch {
      setStatus(
        `${permissionLabel(key, props.locale)}: ${stageText(props.locale, locale.denied)}`,
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <div className="stage-actions">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className="stage-action"
            onClick={() => void request(key)}
          >
            {permissionLabel(key, props.locale)}:{" "}
            {permissionStateText(props.locale, states[key])}
          </button>
        ))}
      </div>
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
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "permissions" in navigator ? "permission-required" : "unsupported",
    ),
  Component: S650Stage,
});
