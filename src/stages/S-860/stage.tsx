import "./styles.css";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { useCallback } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import { messages, productCopy } from "../../i18n";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { ProofLine } from "./ProofLine";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-860
 *
 * 目的: メインページと同じ見出し四行から違いを見つけ、EditContextで誤りを直接校正する。
 * 最初の一手: メインページを思い出し、Busycuveの文字をクリックまたはTabで選んで誤字を直す。
 * 箱ごとの解法:
 * - B01「鉛筆」: Web API Explororの綴りを直接編集して直す。実EditContextで確定したtextが共通descriptorと完全一致すると開く。
 * - B04「鉛筆」: 題名Busycuveを直接編集して直す。実EditContextで確定したtextが共通brandNameのBusycubeと完全一致すると開く。
 * - B03「鉛筆」: 日本語のバズル、英語のpuzzelを直接編集して直す。実EditContextで確定したtextが表示言語の共通taglineと完全一致すると開く。
 * - B02「鉛筆」: 日本語のプラウサ、英語のprowlerを直接編集して直す。実EditContextで確定したtextが表示言語の共通subtitleと完全一致すると開く。
 * 使用API: EditContextの実textupdate/composition/selection/character bounds、DOM Range、ResizeObserver、focus。
 * 権限・privacy: 権限不要。編集中の文字と選択だけをcomponent memoryに保持し、保存・送信しない。
 * 対応環境: EditContextを実装するbrowser。IME変換中は確定前の一致を達成にしない。
 */
function S860Stage(props: Props) {
  const descriptorProblem = props.boxes[manifest.box.B01];
  const titleProblem = props.boxes[manifest.box.B04];
  const subtitleProblem = props.boxes[manifest.box.B02];
  const taglineProblem = props.boxes[manifest.box.B03];
  const copy = messages[props.locale];
  const correctDescriptor = useCallback(
    (value: string) => {
      if (value === productCopy.descriptor) descriptorProblem.solve();
    },
    [descriptorProblem.solve],
  );
  const correctTitle = useCallback(
    (value: string) => {
      if (value === productCopy.brandName) titleProblem.solve();
    },
    [titleProblem.solve],
  );
  const correctSubtitle = useCallback(
    (value: string) => {
      if (value === copy.subtitle) subtitleProblem.solve();
    },
    [copy.subtitle, subtitleProblem.solve],
  );
  const correctTagline = useCallback(
    (value: string) => {
      if (value === copy.tagline) taglineProblem.solve();
    },
    [copy.tagline, taglineProblem.solve],
  );
  return (
    <div className="puzzle s860-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={descriptorProblem} locale={props.locale} />
        <StageProblemGiftBox box={titleProblem} locale={props.locale} />
        <StageProblemGiftBox box={taglineProblem} locale={props.locale} />
        <StageProblemGiftBox box={subtitleProblem} locale={props.locale} />
      </div>
      <header className="hero s860-proof" key={props.locale}>
        <ProofLine
          initialText={productCopy.descriptor.replace("Explorer", "Exploror")}
          className="eyebrow"
          as="span"
          label={stageText(props.locale, locale.B01)}
          onCorrect={correctDescriptor}
        />
        <ProofLine
          initialText={productCopy.brandName.replace("cube", "cuve")}
          className="s860-title"
          as="h1"
          label={stageText(props.locale, locale.B04)}
          onCorrect={correctTitle}
        />
        <ProofLine
          initialText={
            props.locale === "ja"
              ? copy.tagline.replace("パズル", "バズル")
              : copy.tagline.replace("puzzle", "puzzel")
          }
          className="hero__tagline"
          as="p"
          label={stageText(props.locale, locale.B03)}
          onCorrect={correctTagline}
        />
        <ProofLine
          initialText={
            props.locale === "ja"
              ? copy.subtitle.replace("ブラウザ", "プラウサ")
              : copy.subtitle.replace("browser", "prowler")
          }
          className="hero__subtitle"
          as="p"
          label={stageText(props.locale, locale.B02)}
          onCorrect={correctSubtitle}
        />
      </header>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: EditOutlined,
      color: "#fcd34d",
      label: locale.B01,
    },
    [manifest.box.B04]: {
      icon: EditOutlined,
      color: "#fbbf24",
      label: locale.B04,
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
