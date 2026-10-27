import "./styles.css";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { createLinks, textDirective, words } from "./graph";
import excerpt from "./hyperlink-excerpt.json";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-690
 *
 * 目的: 記事の単語リンクを辿り、Text Fragmentが示す二語の循環を見つける。
 * 最初の一手: 記事中の単語を押し、browserが強調した単語のリンクをさらに辿る。
 * 箱ごとの解法:
 * - B02「経路」: どの単語からも最終的にdirectedとgraphの循環へ到達する。□_□を手掛かりにdirected_graphを大文字小文字・前後空白も含め完全一致で入力し確定すると開く。リンク操作自体では開かない。
 * 使用API: native URL Fragment Text Directives、URL fragment、HTML form。単語の各出現を前後文脈で特定し、入場時生成したリンクを挑戦中は固定する。
 * 権限・privacy: 権限不要。回答とリンク構造はページ内だけで扱い、保存・送信しない。記事は同梱し、外部記事の取得は行わない。
 * 対応環境: Text Fragment対応browserで強調と移動を利用する。未対応環境でも記事と入力欄は表示する。
 */
function S690Stage(props: Props) {
  const [links] = useState(createLinks);
  const [articleRevision, setArticleRevision] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const inputId = useId();
  return (
    <div className="puzzle s690-stage">
      <StageProblemGiftBox
        box={props.boxes[manifest.box.B02]}
        locale={props.locale}
      />
      <article key={articleRevision} className="s690-article" lang="en">
        <h2>{excerpt.title}</h2>
        {excerpt.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraph}>
            {words.map((word, index) =>
              word.paragraphIndex === paragraphIndex ? (
                <span key={word.id}>
                  <a
                    href={textDirective(links[index] ?? -1)}
                    data-word={index}
                    onClick={(event) => {
                      if (
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      const href = event.currentTarget.href;
                      // 過去のUA強調を本文から外し、次のnative matchだけを表示する。
                      flushSync(() =>
                        setArticleRevision((current) => current + 1),
                      );
                      window.location.assign(href);
                    }}
                  >
                    {word.text}
                  </a>{" "}
                </span>
              ) : null,
            )}
          </p>
        ))}
        <footer>
          <a href={excerpt.source}>Hyperlink (revision 1373749763)</a>
          {" — "}
          <a href={excerpt.authors}>Wikipedia contributors</a>
          {" · "}
          <a href={excerpt.license} rel="license">
            CC BY-SA 4.0
          </a>
          <p>{excerpt.changes}</p>
        </footer>
      </article>
      <form
        className="s690-answer"
        onSubmit={(event) => {
          event.preventDefault();
          const correct = answer === "directed_graph";
          if (correct) props.boxes[manifest.box.B02].solve();
          setResult(
            stageText(props.locale, correct ? locale.correct : locale.wrong),
          );
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          {stageText(props.locale, locale.answer)}
        </label>
        <input
          id={inputId}
          placeholder="□_□"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button type="submit">{stageText(props.locale, locale.submit)}</button>
        <output aria-live="polite">{result}</output>
      </form>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: RouteOutlined,
      color: "#38bdf8",
      label: locale.B02,
    },
  },
  Component: S690Stage,
});
