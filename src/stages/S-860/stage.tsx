import EditOutlined from "@mui/icons-material/EditOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
import { type Locale, messages, productCopy } from "../../i18n";
import { stageText } from "../locale";
import { locale } from "./locale";

interface ProofLineProps {
  initialText: string;
  className: string;
  as: "h1" | "p";
  label: string;
  onCorrect(value: string): void;
}

function ProofLine({
  initialText,
  className,
  as,
  label,
  onCorrect,
}: ProofLineProps) {
  const elementRef = useRef<HTMLElement>(null);
  const [value, setValue] = useState(initialText);
  const Tag = as;

  useEffect(() => {
    const element = elementRef.current;
    const Edit = window.EditContext;
    if (!element || !Edit) return;
    const context = new Edit({ text: initialText });
    element.editContext = context;
    const update = (event: Event) => {
      const detail = event as EditContextTextUpdateEvent;
      context.updateText(
        detail.updateRangeStart,
        detail.updateRangeEnd,
        detail.text,
      );
      context.updateSelection(
        detail.updateRangeStart + detail.text.length,
        detail.updateRangeStart + detail.text.length,
      );
      const next = context.text;
      setValue(next);
      onCorrect(next);
    };
    context.addEventListener("textupdate", update);
    const updateBounds = () => {
      const rect = element.getBoundingClientRect();
      context.updateControlBounds(rect);
      context.updateSelectionBounds(rect, rect);
      context.updateCharacterBounds(
        0,
        Array.from({ length: Math.max(1, context.text.length) }, () => rect),
      );
    };
    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(element);
    const frame = requestAnimationFrame(updateBounds);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      context.removeEventListener("textupdate", update);
      if (element.editContext === context) element.editContext = undefined;
    };
  }, [initialText, onCorrect]);

  return (
    <Tag
      ref={elementRef as never}
      className={className}
      tabIndex={0}
      role="textbox"
      aria-label={label}
      aria-multiline="false"
    >
      {value}
    </Tag>
  );
}

function corruptedCopy(locale: Locale) {
  const copy = messages[locale];
  return {
    title: "Busycuve: Web API Explorer",
    subtitle:
      locale === "ja"
        ? "ブラウザそのものが鍵となるパズル。"
        : "A new kind of puzzle where the browser itself is the key.",
    tagline:
      locale === "ja"
        ? "いつものブラウザが、突然パズルになる。"
        : "Your everyday browser suddenly becomes the puzzle.",
    correct: {
      title: productCopy.fullTitle,
      subtitle: copy.subtitle,
      tagline: copy.tagline,
    },
  };
}

/**
 * S-860
 *
 * 目的: input/contenteditableではない見出し・本文へEditContextをattachし、共通product copyの誤字・欠語・余分語を直接校正する。
 * 最初の一手: 題名行をclickまたはTab focusし、`Busycuve`のvをbへ直して`Busycube: Web API Explorer`にする。残り2行も見本どおり校正する。
 * 箱ごとの解法:
 * - B01「題名校正の箱」: EditContext `textupdate`後の題名が厳密に`Busycube: Web API Explorer`なら開く。
 * - B02「説明校正の箱」: 日本語は欠けた`新感覚`を戻して`ブラウザそのものが鍵となる新感覚パズル。`、英語は`game`を戻して共通subtitleと完全一致すると開く。
 * - B03「コピー校正の箱」: 日本語は余分な`突然`、英語は`suddenly`を削り、共通tagline（`いつものブラウザが、パズルになる。` / `Your everyday browser becomes the puzzle.`）と一致すると開く。
 * 使用API: EditContextのtextupdate/updateText/updateSelection、control/selection/character bounds、ResizeObserver、通常HTMLElement focus。
 * 権限・privacy: 権限を要求せず、編集文字列は各lineのcomponent memoryにだけ保持する。入力内容やselectionを保存・送信しない。
 * 対応環境: EditContextとIME/selection連携、ResizeObserverを実装するbrowser。
 */
function S860Stage(props: Props) {
  const titleProblem = props.boxes[manifest.box.B01];
  const subtitleProblem = props.boxes[manifest.box.B02];
  const taglineProblem = props.boxes[manifest.box.B03];
  const copy = corruptedCopy(props.locale);
  const correctTitle = useCallback(
    (value: string) => {
      if (value === copy.correct.title) titleProblem.solve();
    },
    [copy.correct.title, titleProblem.solve],
  );
  const correctSubtitle = useCallback(
    (value: string) => {
      if (value === copy.correct.subtitle) subtitleProblem.solve();
    },
    [copy.correct.subtitle, subtitleProblem.solve],
  );
  const correctTagline = useCallback(
    (value: string) => {
      if (value === copy.correct.tagline) taglineProblem.solve();
    },
    [copy.correct.tagline, taglineProblem.solve],
  );

  return (
    <div className="puzzle s860-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={titleProblem} locale={props.locale} />
        <StageProblemGiftBox box={subtitleProblem} locale={props.locale} />
        <StageProblemGiftBox box={taglineProblem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <section
        className="s860-proof"
        aria-label={stageText(props.locale, locale.stageName)}
      >
        <ProofLine
          initialText={copy.title}
          className="s860-proof__title"
          as="h1"
          label={stageText(props.locale, locale.B01)}
          onCorrect={correctTitle}
        />
        <ProofLine
          initialText={copy.subtitle}
          className="s860-proof__subtitle"
          as="p"
          label={stageText(props.locale, locale.B02)}
          onCorrect={correctSubtitle}
        />
        <ProofLine
          initialText={copy.tagline}
          className="s860-proof__tagline"
          as="p"
          label={stageText(props.locale, locale.B03)}
          onCorrect={correctTagline}
        />
      </section>
      <small>{stageText(props.locale, locale.focusHint)}</small>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: EditOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: EditOutlined,
      color: "#f59e0b",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: EditOutlined,
      color: "#d97706",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      window.EditContext ? "available" : "unsupported",
    ),
  Component: S860Stage,
});
