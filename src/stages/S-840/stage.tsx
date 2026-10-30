import "./styles.css";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
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

const threshold = 0.98;

/**
 * S-840
 *
 * 目的: 大きな二次元scroll plane内のtargetを縦横とも合わせ、実IntersectionObserver可視率を98%以上にする。
 * 最初の一手: 初期位置で見える長方形の一部へ向けて縦横scrollし、実可視率を98%以上へ合わせる。
 * 箱ごとの解法:
 * - B01「点線の四角」: 上下左右にscrollしてtargetをroot内へほぼ完全に重ねる。rootの実client sizeより縦横24 px小さいtargetについて、IntersectionObserver entryの`intersectionRatio >= 0.98`になると開く。
 * 使用API: scroll container、ResizeObserverによるtarget size調整、root指定IntersectionObserverとintersectionRatio。
 * 権限・privacy: 権限・外部dataを使わず、現在layoutのintersection ratioだけを表示・判定する。scroll位置や履歴を保存・送信しない。
 * 対応環境: 二軸scroll、ResizeObserver、root付きIntersectionObserverを実装するbrowser。
 */
function S840Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const rootRef = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [targetSize, setTargetSize] = useState({ width: 616, height: 396 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const updateTargetSize = () => {
      setTargetSize({
        width: Math.max(180, root.clientWidth - 24),
        height: Math.max(120, root.clientHeight - 24),
      });
    };
    const observer = new ResizeObserver(updateTargetSize);
    observer.observe(root);
    updateTargetSize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const target = targetRef.current;
    if (!root || !target) return;
    let solved = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          !entry ||
          props.signal.aborted ||
          !Number.isFinite(entry.intersectionRatio) ||
          entry.intersectionRatio < 0 ||
          entry.intersectionRatio > 1
        )
          return;
        setRatio(entry.intersectionRatio);
        if (!solved && entry.intersectionRatio >= threshold) {
          solved = true;
          problem.solve();
        }
      },
      {
        root,
        threshold: Array.from({ length: 1001 }, (_, index) => index / 1000),
      },
    );
    observer.observe(target);
    const disconnect = () => observer.disconnect();
    props.signal.addEventListener("abort", disconnect, { once: true });
    return () => {
      props.signal.removeEventListener("abort", disconnect);
      disconnect();
    };
  }, [problem.solve, props.signal]);

  return (
    <div className="puzzle s840-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <section
        ref={rootRef}
        className="s840-scroll-root"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: 二軸scroll領域を矢印キーでも操作するため。
        tabIndex={0}
        aria-label={stageText(props.locale, locale.plane)}
      >
        <div className="s840-plane">
          <div
            ref={targetRef}
            className="s840-target"
            style={{
              width: targetSize.width,
              height: targetSize.height,
              left: targetSize.width - 56,
              top: targetSize.height - 56,
            }}
            aria-hidden="true"
          />
        </div>
      </section>
      <output className="measurement" aria-live="polite">
        {ratio === null ? "—" : `${(ratio * 100).toFixed(1)}%`} / 98%
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SelectAllOutlined,
      color: "#2dd4bf",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "IntersectionObserver" in window ? "available" : "unsupported",
    ),
  Component: S840Stage,
});
