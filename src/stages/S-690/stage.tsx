import RouteOutlined from "@mui/icons-material/RouteOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useId, useMemo, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const passages = [
  {
    sentence: "Copper moths gather beneath the quiet observatory.",
    token: "text",
  },
  {
    sentence: "A silver compass sleeps inside the eastern drawer.",
    token: "fragments",
  },
  {
    sentence: "Violet rain marks the page no catalog remembers.",
    token: "leave",
  },
  {
    sentence: "The final lantern burns beside the word home.",
    token: "trails",
  },
] as const;

const answer = "busycube{text_fragments_leave_trails}";

function textFragmentHref(sentence: string) {
  const url = new URL(location.href);
  url.hash = `:~:text=${encodeURIComponent(sentence)}`;
  return url.href;
}

/**
 * S-690
 *
 * 目的: 同一pageのText Fragment linkでbrowserに四つの英文を順番にhighlightさせ、各文の横にあるtokenからflagを組み立てる。
 * 最初の一手: 「最初の一節へ」を押し、UA highlightされた`Copper moths...`の横にある`text`を読み、隣の「次の一節」を辿る。
 * 箱ごとの解法:
 * - B01「文章の道の箱」: 四つのlinkを辿って`text`、`fragments`、`leave`、`trails`を得て、formへ`busycube{text_fragments_leave_trails}`を入力する。trim・小文字化後の完全一致で開く。
 * 使用API: URL Fragment Text Directivesの`#:~:text=`、URL API、native browser text highlight/navigation、HTML form。
 * 権限・privacy: 権限・network通信を使用せず、固定英文と入力中の回答だけをpage内で扱う。回答途中の文字列を保存・送信しない。
 * 対応環境: Text Fragmentに対応するbrowserでは四つのUA highlightを順に追える。未対応browserでも固定記事と回答formは表示される。
 */
function S690Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const answerId = useId();
  const hrefs = useMemo(
    () => passages.map((passage) => textFragmentHref(passage.sentence)),
    [],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.trim().toLowerCase() === answer) {
      problem.solve();
      setStatus(stageText(props.locale, locale.answerCorrect));
      return;
    }
    setStatus(stageText(props.locale, locale.answerWrong));
  };

  return (
    <div className="puzzle s690-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p className="s690-stage__intro">
        {stageText(props.locale, locale.intro)}
      </p>
      <a className="stage-action s690-stage__start" href={hrefs[0]}>
        {stageText(props.locale, locale.start)}
      </a>
      <article className="s690-article">
        <p>
          The old map room opened only after rain, when the brass windows forgot
          which way the city faced. Its shelves held field notes from patient
          observers, each written for a reader who could walk through a page
          instead of merely turning it. No index named the important lines.
        </p>
        <p>
          Visitors usually began at the globe near the door. It had a hairline
          crack across one ocean and a thumbprint pressed into another, but no
          country was marked in ink. The curator said that a useful map should
          leave enough room for a traveler to notice where they had arrived.
        </p>
        <p>
          Around the room, brass labels named ordinary tools: ruler, lens,
          string, brush, envelope. Their descriptions were equally ordinary,
          though each one mentioned a route, a return, or a place to pause. The
          notes never demanded attention. They waited for it with remarkable
          patience.
        </p>
        {passages.map((passage, index) => (
          <section className="s690-passage" key={passage.token}>
            <p>{passage.sentence}</p>
            <aside>
              <code>{passage.token}</code>
              {index + 1 < passages.length ? (
                <a href={hrefs[index + 1]}>
                  {stageText(props.locale, locale.next)}
                </a>
              ) : null}
            </aside>
          </section>
        ))}
        <p>
          In the mornings, a messenger brought weather reports that had already
          become wrong. The archivist filed them beside sketches of roofs,
          receipts for lamp oil, and letters from people who had taken the long
          way home. Nothing was discarded merely because the day had changed.
        </p>
        <p>
          The room had no secret door, despite the stories told by new staff.
          There were only shelves, margins, and the small decisions a reader
          made while moving from one observation to the next. Some routes were
          recorded in ink; others appeared only when the reader followed them.
        </p>
        <p>
          The archivist insisted that every useful route had to be short enough
          to repeat, yet strange enough to remember. A reader who followed the
          signals would leave with a compact instruction rather than a borrowed
          story. The rest of the cabinet could stay quietly closed.
        </p>
        <p>
          Beyond the observatory, the paper road continued through rooms that
          were never built. The descriptions mattered less than the small marks
          left beside them: each mark was ordinary on its own, but together they
          described how this page wanted to be read.
        </p>
        <p>
          At closing time, the curator checked that every window was latched and
          every loose sheet had found a folder. Then they left the map room
          exactly as it was: quiet, unfinished, and ready for another person to
          discover that a page can offer directions without owning the journey.
        </p>
        <p>
          A note taped to the desk described the practice in plain language.
          Read the line the browser points to. Keep the small word beside it.
          Follow the next line, not because a script counts the trip, but
          because the marks become meaningful only when the reader moves.
        </p>
      </article>
      <form className="s690-answer" onSubmit={submit}>
        <label htmlFor={answerId}>
          {stageText(props.locale, locale.answerLabel)}
        </label>
        <div>
          <input
            id={answerId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={stageText(props.locale, locale.answerPlaceholder)}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
          />
          <button type="submit">
            {stageText(props.locale, locale.answerLabel)}
          </button>
        </div>
        <small>{stageText(props.locale, locale.answerHint)}</small>
        <output aria-live="polite">{status}</output>
      </form>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#38bdf8",
      label: locale.B01,
    },
  },
  probe: () => "available",
  Component: S690Stage,
});
