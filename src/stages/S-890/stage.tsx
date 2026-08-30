import FullscreenOutlined from "@mui/icons-material/FullscreenOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-890 — 額縁だけのFullscreen
 *
 * 目的: browser全体ではなく、`requestFullscreen()`を呼んだ特定HTML要素だけが実fullscreen要素になる状態を作る。
 * 最初の一手: 額縁の下にある「額縁を全画面にする」を押し、browserの許可に従って額縁をfullscreenにする。
 * 箱ごとの解法:
 * - B01: 額縁が画面全体を占め、箱を覆っていたveilが消えた状態で箱を直接クリックする。trusted click時にも`document.fullscreenElement`がその額縁要素なら開く。
 * 使用API: Fullscreen APIの`Element.requestFullscreen()`、`document.fullscreenElement`、`fullscreenchange`、`document.exitFullscreen()`。
 * 権限・privacy: fullscreenへの遷移以外の権限を要求せず、画面内容・操作履歴・端末情報を保存または送信しない。
 * 対応環境: user activationからのFullscreen APIに対応し、任意のHTML要素をfullscreenにできるbrowser。
 */
function S890Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const frameRef = useRef<HTMLDivElement>(null);
  const exitPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const update = () =>
      setIsActive(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", update);
    update();
    const stop = () => {
      if (
        document.fullscreenElement !== frameRef.current ||
        exitPromiseRef.current
      )
        return;
      exitPromiseRef.current = document
        .exitFullscreen()
        .catch(() => undefined)
        .finally(() => {
          exitPromiseRef.current = undefined;
        });
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      document.removeEventListener("fullscreenchange", update);
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const request = () => {
    void frameRef.current?.requestFullscreen().catch(() => undefined);
  };

  return (
    <div className="puzzle puzzle--centered s890-stage">
      <p>{stageText(props.locale, locale.intro)}</p>
      <div
        ref={frameRef}
        className="s890-frame"
        data-fullscreen={isActive ? "true" : "false"}
      >
        <div className="s890-frame__header">Busycube frame</div>
        <div className="s890-frame__content">
          <StageProblemGiftBox
            box={problem}
            locale={props.locale}
            onClick={
              isActive
                ? (event) => {
                    if (
                      event.isTrusted &&
                      document.fullscreenElement === frameRef.current
                    ) {
                      problem.solve();
                    }
                  }
                : undefined
            }
          />
          <div className="s890-frame__veil" aria-hidden="true" />
        </div>
        <button type="button" className="stage-action" onClick={request}>
          {stageText(props.locale, locale.fullscreen)}
        </button>
      </div>
      <output className="interaction-status" aria-live="polite">
        {stageText(props.locale, isActive ? locale.ready : locale.waiting)}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: FullscreenOutlined,
      color: "#0ea5e9",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "requestFullscreen" in Element.prototype ? "available" : "unsupported",
    ),
  Component: S890Stage,
});
