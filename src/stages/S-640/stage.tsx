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
 * 最初の一手: B01の`cafÃ© franÃ§ais`がUTF-8 bytesをWindows-1252表示した結果だと見抜き、共通欄へ`café français`と入力する。
 * 箱ごとの解法:
 * - B01「文字コードの箱 1」: UTF-8→Windows-1252のmojibakeへ、正解`café français`を完全一致で入力すると開く。
 * - B02「文字コードの箱 2」: KOI8-R→Windows-1251のmojibakeへ、正解`русский ящик`を完全一致で入力すると開く。
 * - B03「文字コードの箱 3」: KOI8-U→IBM866のmojibakeへ、正解`український код`を完全一致で入力すると開く。
 * - B04「文字コードの箱 4」: Macintosh→x-mac-cyrillicのmojibakeへ、正解`åbn æsken`を完全一致で入力すると開く。
 * - B05「文字コードの箱 5」: Windows-1255→ISO-8859-7のmojibakeへ、正解`תיבת קוד`を完全一致で入力すると開く。
 * - B06「文字コードの箱 6」: Windows-874→Windows-1252のmojibakeへ、正解`กล่อง รหัส`を完全一致で入力すると開く。
 * - B07「文字コードの箱 7」: ISO-8859-2→Macintoshのmojibakeへ、正解`český kód`を完全一致で入力すると開く。
 * - B08「文字コードの箱 8」: GBK→Big5のmojibakeへ、正解`编码 宝箱`を完全一致で入力すると開く。
 * 使用API: Encoding StandardのTextDecoder対応を前提に検証済みの固定byte/encoding fixtureとHTML text input。
 * 権限・privacy: 権限を要求せず、Git管理済みfixtureと共通回答値だけを扱う。入力回答は入場中のmemoryにだけ保持し、保存・送信しない。
 * 対応環境: TextDecoderとfixtureで使うUTF/legacy encoding label、各scriptのfont描画を実装するbrowser。
 */
function S640Stage(props: Props) {
  const [answer, setAnswer] = useState("");
  const boxIdAt = (index: number) => {
    const boxId = manifest.boxIds[index];
    if (!boxId) throw new RangeError(`No S-640 box for fixture index ${index}`);
    return boxId;
  };
  return (
    <div className="puzzle parallel-puzzle">
      <div className="problem-row problem-row--wrap">
        {encodingFixtures.map((_fixture, index) => {
          const boxId = boxIdAt(index);
          return (
            <StageProblemGiftBox
              key={boxId}
              box={props.boxes[boxId]}
              locale={props.locale}
            />
          );
        })}
      </div>
      <section className="encoding-group">
        <h2>{stageText(props.locale, locale.mojibake)}</h2>
        <div className="encoding-question-grid">
          {encodingFixtures.map((fixture, index) => {
            const boxId = boxIdAt(index);
            return (
              <article key={boxId} className="parallel-question-card">
                <strong>{boxId}</strong>
                <code>{encodingQuestionText(fixture)}</code>
              </article>
            );
          })}
        </div>
      </section>
      <label className="parallel-answer">
        {stageText(props.locale, locale.decoded)}
        <input
          value={answer}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setAnswer(next);
            const index = encodingFixtures.findIndex(
              (fixture) => fixture.expectedText === next,
            );
            if (index < 0) return;
            props.boxes[boxIdAt(index)].solve();
          }}
          aria-label={stageText(props.locale, locale.sharedAnswer)}
        />
      </label>
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
    [manifest.box.B02]: {
      icon: VisibilityOffOutlined,
      color: "#6366f1",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: VisibilityOffOutlined,
      color: "#4f46e5",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: VisibilityOffOutlined,
      color: "#4338ca",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: VisibilityOffOutlined,
      color: "#818cf8",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: VisibilityOffOutlined,
      color: "#6366f1",
      label: locale.B06,
    },
    [manifest.box.B07]: {
      icon: VisibilityOffOutlined,
      color: "#4f46e5",
      label: locale.B07,
    },
    [manifest.box.B08]: {
      icon: VisibilityOffOutlined,
      color: "#4338ca",
      label: locale.B08,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "TextDecoder" in window ? "available" : "unsupported",
    ),
  Component: S640Stage,
});
