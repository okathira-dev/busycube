import "./styles.css";
import { createSvgIcon } from "@mui/material/utils";
import { useEffect } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const letterIcon = (size: number) =>
  createSvgIcon(
    <text x="2" y="21" fontSize={size}>
      A
    </text>,
    `LetterA${size}`,
  );
const icons = [
  letterIcon(11),
  letterIcon(15),
  letterIcon(19),
  letterIcon(23),
] as const;

/**
 * S-480
 *
 * 目的: ブラウザー既定文字サイズの実測値を四つの帯で観測する。
 * 最初の一手: 大小のAを見てブラウザー設定の既定文字サイズを変える。
 * 箱ごとの解法:
 * - B01「文字A」: 既定文字サイズを小さくする。body上のfont-size:1rem probeのcomputed値が有限かつ0より大きく15px未満なら開く。
 * - B02「文字A」: 既定文字サイズを標準へ変える。同じ実computed値が15px以上18px未満なら開く。
 * - B03「文字A」: 既定文字サイズを大きくする。同じ実computed値が18px以上22px未満なら開く。
 * - B04「文字A」: 既定文字サイズをさらに大きくする。同じ実computed値が22px以上なら開く。訪問間の進捗は累積できる。
 * 使用API: getComputedStyle、ResizeObserver。
 * 権限・privacy: 権限を要求せず、既定文字サイズはこの挑戦中の判定だけに使い保存・送信しない。表示設定側はS-930へ分離する。
 * 対応環境: computed styleとResizeObserverを備え、利用者が既定文字サイズを変更できるブラウザー。
 */
function S480Stage(props: Props) {
  const problems = [
    props.boxes.B01,
    props.boxes.B02,
    props.boxes.B03,
    props.boxes.B04,
  ] as const;
  const [small, standard, large, extra] = problems.map(
    (problem) => problem.solve,
  );
  useEffect(() => {
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;font-size:1rem;line-height:1";
    probe.textContent = "M";
    document.body.append(probe);
    const inspect = () => {
      if (props.signal.aborted) return;
      const pixels = Number.parseFloat(getComputedStyle(probe).fontSize);
      if (!Number.isFinite(pixels) || pixels <= 0) return;
      const solve =
        pixels < 15
          ? small
          : pixels < 18
            ? standard
            : pixels < 22
              ? large
              : extra;
      solve?.();
    };
    inspect();
    const observer = new ResizeObserver(inspect);
    observer.observe(probe);
    const stop = () => {
      observer.disconnect();
      probe.remove();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [small, standard, large, extra, props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <span className="font-sample" aria-hidden="true">
        A
      </span>
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: { icon: icons[0], tone: "blue", label: locale.letter },
    [manifest.box.B02]: { icon: icons[1], tone: "green", label: locale.letter },
    [manifest.box.B03]: { icon: icons[2], tone: "amber", label: locale.letter },
    [manifest.box.B04]: { icon: icons[3], tone: "rose", label: locale.letter },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "ResizeObserver" in window ? "available" : "unsupported",
    ),
  Component: S480Stage,
});
