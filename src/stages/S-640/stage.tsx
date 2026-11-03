import "./styles.css";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import {
  encodingFixtures,
  encodingQuestionText,
} from "../../fixtures/encoding";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-640
 *
 * 目的: 8個の固定byte列を誤ったlegacy encodingで表示したmojibakeから、元encodingの正しい文字列を復元する。
 * 最初の一手: B01の`cafÃ© franÃ§ais`がUTF-8 bytesをWindows-1252表示した結果だと見抜き、その問題の欄へ`café français`と入力する。
 * 箱ごとの解法:
 * - B01「箱」: UTF-8→Windows-1252のmojibakeへ、正解`café français`を完全一致で入力すると開く。
 * - B09「箱」: KOI8-R→Windows-1251のmojibakeへ、正解`матрёшка`を完全一致で入力すると開く。
 * - B10「箱」: KOI8-U→IBM866のmojibakeへ、正解`пампушка`を完全一致で入力すると開く。
 * - B11「箱」: Macintosh→x-mac-cyrillicのmojibakeへ、正解`smørrebrød`を完全一致で入力すると開く。
 * - B12「箱」: Windows-1255→ISO-8859-7のmojibakeへ、正解`חנוכה`を完全一致で入力すると開く。
 * - B13「箱」: Windows-874→Windows-1252のmojibakeへ、正解`ต้มยำกุ้ง`を完全一致で入力すると開く。
 * - B14「箱」: ISO-8859-2→Macintoshのmojibakeへ、正解`svíčková`を完全一致で入力すると開く。
 * - B15「箱」: GBK→Big5のmojibakeへ、正解`月饼`を完全一致で入力すると開く。
 * 使用API: Encoding StandardのTextDecoder対応を前提に検証済みの固定byte/encoding fixtureとHTML text input。
 * 権限・privacy: 権限を要求せず、Git管理済みfixtureと各問題の回答値だけを扱う。入力回答は入場中のmemoryにだけ保持し、保存・送信しない。
 * 対応環境: TextDecoderとfixtureで使うUTF/legacy encoding label、各scriptのfont描画を実装するbrowser。
 */
function S640Stage(props: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const boxIdAt = (index: number) => {
    const boxId = manifest.boxIds[index];
    if (!boxId) throw new RangeError(`No S-640 box for fixture index ${index}`);
    return boxId;
  };
  return (
    <div className="puzzle parallel-puzzle">
      <section className="encoding-group">
        <div className="encoding-question-grid">
          {encodingFixtures.map((fixture, index) => {
            const boxId = boxIdAt(index);
            return (
              <article key={boxId} className="parallel-question-card">
                <StageProblemGiftBox
                  box={props.boxes[boxId]}
                  locale={props.locale}
                  showIcon={false}
                />
                <code id={`${boxId}-question`}>
                  {encodingQuestionText(fixture)}
                </code>
                <label className="parallel-answer">
                  <span id={`${boxId}-answer`} className="sr-only">
                    {stageText(props.locale, locale.decoded)}
                  </span>
                  <input
                    aria-labelledby={`${boxId}-question ${boxId}-answer`}
                    value={answers[boxId] ?? ""}
                    onChange={(event) => {
                      const next = event.currentTarget.value;
                      setAnswers((current) => ({ ...current, [boxId]: next }));
                      if (
                        !props.signal.aborted &&
                        fixture.expectedText === next
                      )
                        props.boxes[boxId].solve();
                    }}
                  />
                </label>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VisibilityOffOutlined,
      color: "#818cf8",
      label: locale.B01,
    },
    [manifest.box.B09]: {
      icon: VisibilityOffOutlined,
      color: "#6366f1",
      label: locale.B09,
    },
    [manifest.box.B10]: {
      icon: VisibilityOffOutlined,
      color: "#4f46e5",
      label: locale.B10,
    },
    [manifest.box.B11]: {
      icon: VisibilityOffOutlined,
      color: "#4338ca",
      label: locale.B11,
    },
    [manifest.box.B12]: {
      icon: VisibilityOffOutlined,
      color: "#818cf8",
      label: locale.B12,
    },
    [manifest.box.B13]: {
      icon: VisibilityOffOutlined,
      color: "#6366f1",
      label: locale.B13,
    },
    [manifest.box.B14]: {
      icon: VisibilityOffOutlined,
      color: "#4f46e5",
      label: locale.B14,
    },
    [manifest.box.B15]: {
      icon: VisibilityOffOutlined,
      color: "#4338ca",
      label: locale.B15,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "TextDecoder" in window ? "available" : "unsupported",
    ),
  Component: S640Stage,
});
