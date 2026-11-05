import "./styles.css";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import NoteAltOutlined from "@mui/icons-material/NoteAltOutlined";
import ShortcutOutlined from "@mui/icons-material/ShortcutOutlined";
import WebAssetOutlined from "@mui/icons-material/WebAssetOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { createSvgIcon } from "@mui/material";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  changeBadge,
  isBusycube,
  launchSource,
  type PwaNavigator,
  usableTitlebar,
} from "./pwa";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type BadgeAttempt = { number: number; ready: boolean; retry: () => void };

const BusycubeBadge = createSvgIcon(
  <>
    <image href="/icon.svg" width="22" height="22" />
    <circle cx="19" cy="5" r="4" fill="#ef4444" stroke="#fff" />
  </>,
  "BusycubeBadge",
);

function AppPicture({
  browser = false,
  badge = false,
}: {
  browser?: boolean;
  badge?: boolean;
}) {
  return (
    <div
      className={`s080-app ${browser ? "s080-app--browser" : ""}`}
      aria-hidden="true"
    >
      <div className="s080-app__bar">{browser ? <span>▱ ▱ ▱</span> : null}</div>
      <div className="s080-app__icon">
        <img src="/icon.svg" alt="" width="48" height="48" />
        {badge ? <span className="s080-app__badge" /> : null}
      </div>
    </div>
  );
}

/**
 * S-080
 * 目的: インストールしたBusycubeの表示・外側の数字・OS連携の入口を六箱で調べる。
 * 最初の一手: インストールのアイコンを手掛かりにBusycubeを追加し、アプリとして開く。
 * 箱ごとの解法:
 * - B01「画面と下向き矢印」: Busycubeをアプリで開く。初期状態またはchangeで実matchMedia('(display-mode: standalone)').matchesがtrueなら開く。インストール操作や起動履歴の証明ではない。
 * - B02「バッジ付きBusycube」: OS側のアプリアイコンに出た数字を入力する。今回の1〜99の乱数のsetAppBadgeが成功した後、入力が十進表記と完全一致すると開く。許可が必要な環境では箱から通知許可を求める。呼出成功だけでは開かない。
 * - B03「ショートカットの矢印」: アプリアイコンのショートカットから起動する。LaunchQueue対応のアプリ表示で、manifestの同一originの専用初期URLまたはtargetURL（stage=S-080、source=shortcut）を受領すると開く。OSの操作経路そのものは識別できない。
 * - B04「紙と鉛筆」: 対応OSの新しいメモの入口から起動する。同条件でnote_taking.new_note_urlのsource=noteを受領すると開く。メモの本文・筆記・保存は判定しない。
 * - B05「タブ付きブラウザーの窓」: インストール後に通常タブへ戻る。入場/復帰時の実getInstalledRelatedAppsがこのmanifestのwebappを返し、完了時にもdisplay-mode: browserなら開く。起動中状態や全アプリの列挙ではない。
 * - B06「窓（タイトルバー内）」: アプリのタイトルバー内の箱をクリックする。実windowControlsOverlay.visibleがtrueで、有効なgetTitlebarAreaRect内に収めた箱への実クリック座標も同領域内なら開く。通常画面の代替箱は開かない。
 * 使用API: matchMedia、App Badging、Notification.requestPermission、getInstalledRelatedApps、manifest shortcuts/note_taking/launch_handler、LaunchQueue、Window Controls Overlay。
 * 権限・privacy: 通知権限は箱操作時だけ求める。数字・関連付けの一致・表示状態はメモリー内の判定のみ。メモ本文や他アプリ一覧を取得せず、保存・送信しない。非表示中はバッジを保持し、離脱時に消す。
 * 対応環境: 各OSのPWA機能に依存。通常タブ検知は同一scope PWAの検出対応環境、メモ入口は主にChromeOS、タイトルバーはdesktopのWindow Controls Overlay。各箱は独立する。
 */
function S080Stage(props: Props) {
  const answerId = useId();
  const boxesRef = useRef(props.boxes);
  boxesRef.current = props.boxes;
  const badgeRef = useRef<BadgeAttempt | null>(null);
  const [answer, setAnswer] = useState("");
  const [badgeStatus, setBadgeStatus] = useState<CommonStatus>("waiting");
  const [relatedStatus, setRelatedStatus] = useState<
    CommonStatus | "installed" | "notInstalled"
  >("waiting");
  const [launchStatus, setLaunchStatus] = useState<CommonStatus>("waiting");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const opened = useRef(new Set<string>());

  useEffect(() => {
    if (props.signal.aborted) return;
    let active = true;
    let generation = 0;
    let permissionPending = false;
    const nav: PwaNavigator = navigator;
    const standalone = matchMedia("(display-mode: standalone)");
    const browser = matchMedia("(display-mode: browser)");
    const overlayMode = matchMedia("(display-mode: window-controls-overlay)");
    const overlay = navigator.windowControlsOverlay;
    const solve = (id: keyof Props["boxes"]) => {
      if (!active || props.signal.aborted || opened.current.has(id)) return;
      opened.current.add(id);
      boxesRef.current[id].solve();
    };
    const classify = (error: unknown): CommonStatus =>
      error instanceof DOMException &&
      (error.name === "NotAllowedError" || error.name === "SecurityError")
        ? "denied"
        : "error";
    const inApp = () => standalone.matches || overlayMode.matches;
    const inspectLaunch = (target: string) => {
      if (!active || !inApp() || !window.launchQueue) return;
      const source = launchSource(target, location.origin);
      if (!source) return;
      solve(source === "shortcut" ? "B03" : "B04");
      setLaunchStatus("launched");
    };
    inspectLaunch(location.href);
    // Consume the one arrival parameter so ordinary in-page navigation cannot replay it.
    if (launchSource(location.href, location.origin)) {
      const clean = new URL(location.href);
      clean.searchParams.delete("source");
      history.replaceState(history.state, "", clean);
    }
    const queue = window.launchQueue;
    queue?.setConsumer((params) => inspectLaunch(params.targetURL));
    if (!queue) setLaunchStatus("unavailable");

    const random = new DataView(
      crypto.getRandomValues(new Uint32Array(1)).buffer,
    ).getUint32(0);
    const challenge = 1 + (random % 99);
    const attempt: BadgeAttempt = {
      number: challenge,
      ready: false,
      retry: () => {},
    };
    badgeRef.current = attempt;
    const writeBadge = () => {
      if (!nav.setAppBadge || !nav.clearAppBadge) {
        setBadgeStatus("unavailable");
        return;
      }
      void changeBadge(async () => {
        if (!active) return;
        try {
          await nav.setAppBadge?.(challenge);
          if (!active) return;
          attempt.ready = true;
          setBadgeStatus("active");
        } catch (error) {
          if (active) {
            attempt.ready = false;
            setBadgeStatus(classify(error));
          }
        }
      });
    };
    attempt.retry = () => {
      if (
        !active ||
        permissionPending ||
        !nav.setAppBadge ||
        !nav.clearAppBadge
      )
        return;
      // Some OSs accept the badge call before notification permission, but hide it.
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default" &&
        typeof Notification.requestPermission === "function"
      ) {
        permissionPending = true;
        void Notification.requestPermission()
          .then((permission) => {
            if (!active) return;
            if (permission === "granted") writeBadge();
            else setBadgeStatus(permission === "denied" ? "denied" : "prompt");
          })
          .catch((error) => {
            if (active) setBadgeStatus(classify(error));
          })
          .finally(() => {
            permissionPending = false;
          });
      } else writeBadge();
    };
    writeBadge();

    const inspectRelated = async () => {
      const current = ++generation;
      if (!nav.getInstalledRelatedApps) {
        setRelatedStatus("unavailable");
        return;
      }
      try {
        const apps = await nav.getInstalledRelatedApps();
        if (!active || current !== generation) return;
        const installed = apps.some((app) => isBusycube(app, location.origin));
        setRelatedStatus(installed ? "installed" : "notInstalled");
        if (installed && browser.matches) solve("B05");
      } catch (error) {
        if (active && current === generation) setRelatedStatus(classify(error));
      }
    };
    const inspectGeometry = () => {
      if (active) setRect(usableTitlebar(overlay));
    };
    const inspect = () => {
      if (!active || document.hidden) return;
      if (standalone.matches) solve("B01");
      inspectGeometry();
      void inspectRelated();
    };
    standalone.addEventListener("change", inspect);
    browser.addEventListener("change", inspect);
    overlayMode.addEventListener("change", inspect);
    overlay?.addEventListener("geometrychange", inspectGeometry);
    window.addEventListener("focus", inspect);
    document.addEventListener("visibilitychange", inspect);
    inspect();
    const dispose = () => {
      if (!active) return;
      active = false;
      attempt.ready = false;
      if (badgeRef.current === attempt) badgeRef.current = null;
      standalone.removeEventListener("change", inspect);
      browser.removeEventListener("change", inspect);
      overlayMode.removeEventListener("change", inspect);
      overlay?.removeEventListener("geometrychange", inspectGeometry);
      window.removeEventListener("focus", inspect);
      document.removeEventListener("visibilitychange", inspect);
      setRect(null);
      queue?.setConsumer(() => {});
      if (nav.clearAppBadge)
        void changeBadge(
          () => nav.clearAppBadge?.() ?? Promise.resolve(),
        ).catch(() => undefined);
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);

  const titleBox = (
    <StageProblemGiftBox
      box={props.boxes.B06}
      locale={props.locale}
      onClick={(event) => {
        if (props.signal.aborted || !event.isTrusted || !rect) return;
        const current = usableTitlebar(navigator.windowControlsOverlay);
        if (
          current &&
          event.clientX >= current.left &&
          event.clientX < current.right &&
          event.clientY >= current.top &&
          event.clientY < current.bottom &&
          !opened.current.has("B06")
        ) {
          opened.current.add("B06");
          props.boxes.B06.solve();
        }
      }}
    />
  );

  return (
    <div className="puzzle s080-puzzle">
      <div className="s080-entrances">
        <div className="s080-cell">
          <AppPicture />
          <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
        </div>
        <div className="s080-cell">
          <AppPicture badge />
          <StageProblemGiftBox
            box={props.boxes.B02}
            locale={props.locale}
            onClick={() => badgeRef.current?.retry()}
          />
          <form
            className="s080-answer"
            onSubmit={(event) => {
              event.preventDefault();
              const attempt = badgeRef.current;
              if (
                !props.signal.aborted &&
                attempt?.ready &&
                answer === String(attempt.number) &&
                !opened.current.has("B02")
              ) {
                opened.current.add("B02");
                props.boxes.B02.solve();
                setBadgeStatus("matched");
              } else if (attempt?.ready) setBadgeStatus("invalid");
            }}
          >
            <label className="sr-only" htmlFor={answerId}>
              {stageText(props.locale, locale.answer)}
            </label>
            <input
              id={answerId}
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <button
              type="submit"
              className="stage-action"
              aria-label={stageText(props.locale, locale.submit)}
            >
              ↵
            </button>
          </form>
          <p role="status" className="interaction-status">
            {statusText(props.locale, badgeStatus)}
          </p>
        </div>
      </div>
      <div className="s080-other-entrances">
        <div className="s080-cell">
          <StageProblemGiftBox box={props.boxes.B03} locale={props.locale} />
        </div>
        <div className="s080-cell">
          <StageProblemGiftBox box={props.boxes.B04} locale={props.locale} />
        </div>
        <div className="s080-cell">
          <AppPicture browser />
          <StageProblemGiftBox box={props.boxes.B05} locale={props.locale} />
          <p role="status" className="interaction-status">
            {relatedStatus === "installed" || relatedStatus === "notInstalled"
              ? stageText(props.locale, locale[relatedStatus])
              : statusText(props.locale, relatedStatus)}
          </p>
        </div>
        {!rect ? <div className="s080-cell">{titleBox}</div> : null}
      </div>
      <p role="status" className="interaction-status">
        {statusText(props.locale, launchStatus)}
      </p>
      {rect
        ? createPortal(
            <div
              className="s080-titlebar"
              style={{
                left: rect.x,
                top: rect.y,
                width: Math.min(rect.width, 80),
                height: rect.height,
              }}
            >
              {titleBox}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: InstallDesktopOutlined,
      color: "#f59e0b",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: BusycubeBadge,
      color: "#fbbf24",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: ShortcutOutlined,
      color: "#c084fc",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: NoteAltOutlined,
      color: "#a78bfa",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: WebAssetOutlined,
      color: "#818cf8",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: WindowOutlined,
      color: "#c084fc",
      label: locale.B06,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof window.matchMedia === "function" ? "available" : "unsupported",
    ),
  Component: S080Stage,
});
