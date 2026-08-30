import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type PeripheralStatus = "idle" | "active" | "unavailable";

interface BadgeNavigator extends Navigator {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

/**
 * S-210
 *
 * 目的: page外のapp iconやtaskbar等に表示されるbadge numberを、成功したApp Badging API呼出しで1から3へ進める。
 * 最初の一手: install済みappとして開き、「外側を一つ進める」を3回押して外側のbadgeが1→2→3になることを確認する。
 * 箱ごとの解法:
 * - B01「外側の数字の箱」: `setAppBadge(1)`、`setAppBadge(2)`、`setAppBadge(3)`がこのattemptで順に成功し、内部levelが3へ到達すると開く。
 * 使用API: App Badging APIの`navigator.setAppBadge()`と`clearAppBadge()`。
 * 権限・privacy: 権限や個人dataを使用せず、固定の1〜3だけをapp badgeへ表示する。stage離脱時にはbadgeをclearする。
 * 対応環境: secure contextでApp Badging APIを実装し、install済みWeb App等の外側UIへbadgeを表示できるbrowser/OS。
 */
function S210Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<PeripheralStatus>("idle");
  const levelRef = useRef(0);

  useEffect(() => {
    const cleanup = () => {
      const badge = navigator as unknown as Partial<BadgeNavigator>;
      void badge.clearAppBadge?.().catch(() => undefined);
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const advance = async () => {
    const badge = navigator as unknown as BadgeNavigator;
    const next = Math.min(3, levelRef.current + 1);
    try {
      await badge.setAppBadge(next);
      if (props.signal.aborted) {
        void badge.clearAppBadge().catch(() => undefined);
        return;
      }
      levelRef.current = next;
      setLevel(next);
      setStatus("active");
      if (next === 3) problem.solve();
    } catch {
      if (!props.signal.aborted) setStatus("unavailable");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="badge-preview" aria-hidden="true">
        B<span>{level || "·"}</span>
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void advance()}
      >
        {stageText(props.locale, locale.advanceBadge)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: BadgeOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "setAppBadge" in navigator
        ? "available"
        : "unsupported",
    ),
  Component: S210Stage,
});
