import "./styles.css";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useEffect, useRef } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

function WordCanvas({ word }: { word: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "700 42px ui-monospace, monospace";
    context.fillStyle = "#f7f3ff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(word, canvas.width / 2, canvas.height / 2);
  }, [word]);
  return (
    <canvas
      ref={canvasRef}
      className="s800-word"
      width={260}
      height={90}
      role="img"
      aria-label={word}
    />
  );
}

/**
 * S-800
 *
 * 目的: 検索語とURL断片を手掛かりに、browser自身のmatchで隠れた二つの文章を見つける。
 * 最初の一手: 虫眼鏡の下のcanvasの語を読み、ページ内検索で探す。
 * 箱ごとの解法:
 * - B02「虫眼鏡」: canvasの残り火（英語ember）をページ内検索し、その語を含むhidden=until-found要素の実beforematchを受けると開く。
 * - B01「リンク」: 表示された対象言語の全文Text FragmentをURL末尾に付けて移動し、小瓶とコバルトの隠れた文の実beforematchを受けると開く。
 * 使用API: native Text Fragments、hidden=until-found、beforematch、Canvas 2D。
 * 権限・privacy: 権限不要。検索語や入力を保存・送信せず、browserのbeforematchだけで判定する。
 * 対応環境: hidden=until-foundとText Fragment対応browser。発見経路は制限せず、どちらの箱も検索/URLのいずれからでも開く。
 */
function S800Stage(props: Props) {
  const encodedTargetRef = useRef<HTMLElement>(null);
  const wordTargetRef = useRef<HTMLElement>(null);
  const encodedProblem = props.boxes[manifest.box.B01];
  const wordProblem = props.boxes[manifest.box.B02];
  const encodedSentence = stageText(props.locale, locale.urlSentence);
  const searchSentence = stageText(props.locale, locale.searchSentence);
  useEffect(() => {
    const encodedTarget = encodedTargetRef.current;
    const wordTarget = wordTargetRef.current;
    if (!encodedTarget || !wordTarget) return;
    encodedTarget.lang = props.locale;
    wordTarget.lang = props.locale;
    encodedTarget.setAttribute("hidden", "until-found");
    wordTarget.setAttribute("hidden", "until-found");
    const controller = new AbortController();
    encodedTarget.addEventListener("beforematch", encodedProblem.solve, {
      signal: controller.signal,
    });
    wordTarget.addEventListener("beforematch", wordProblem.solve, {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [encodedProblem.solve, wordProblem.solve, props.locale]);
  const passage = (text: { ja: string; en: string }) => (
    <p>{stageText(props.locale, text)}</p>
  );
  return (
    <div className="puzzle s800-stage">
      <div className="s800-prompts">
        <section>
          <StageProblemGiftBox box={wordProblem} locale={props.locale} />
          <WordCanvas word={stageText(props.locale, locale.searchWord)} />
        </section>
        <section>
          <StageProblemGiftBox box={encodedProblem} locale={props.locale} />
          <code>{`#:~:text=${encodeURIComponent(encodedSentence)}`}</code>
        </section>
      </div>
      <article className="s800-article">
        {passage(locale.passage1)}
        {passage(locale.passage2)}
        {passage(locale.passage3)}
        <section ref={encodedTargetRef} hidden>
          <p>{encodedSentence}</p>
        </section>
        {passage(locale.passage4)}
        {passage(locale.passage5)}
        {passage(locale.passage6)}
        <section ref={wordTargetRef} hidden>
          <p>{searchSentence}</p>
        </section>
        {passage(locale.passage7)}
      </article>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: SearchOutlined,
      color: "#c084fc",
      label: locale.B02,
    },
    [manifest.box.B01]: {
      icon: LinkOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "onbeforematch" in HTMLElement.prototype ? "available" : "unsupported",
    ),
  Component: S800Stage,
});
