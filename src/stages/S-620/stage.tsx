import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";
import { unicodeExpressionText, unicodeFixtures } from "../../fixtures/unicode";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-620
 *
 * 目的: 17種類のUnicode numeral systemで書かれた加算を読み、すべて同じASCII十進回答欄へ戻す。
 * 最初の一手: fixture fontの読込を待ち、B01のASCII式`123 + 456`を計算して共通回答欄へ`579`と入力する。
 * 箱ごとの解法:
 * - B01「異体数字 1」: ASCII / European digitsで表示された123 + 456を計算し、回答欄が厳密に`579`になると開く。
 * - B02「異体数字 2」: Arabic-Indic digitsで表示された234 + 567を計算し、回答欄が厳密に`801`になると開く。
 * - B03「異体数字 3」: Eastern Arabic-Indic digitsで表示された345 + 678を計算し、回答欄が厳密に`1023`になると開く。
 * - B04「異体数字 4」: Han numeralsで表示された456 + 321を計算し、回答欄が厳密に`777`になると開く。
 * - B05「異体数字 5」: Osmanya digitsで表示された517 + 264を計算し、回答欄が厳密に`781`になると開く。
 * - B06「異体数字 6」: Adlam digitsで表示された629 + 154を計算し、回答欄が厳密に`783`になると開く。
 * - B07「異体数字 7」: N'Ko digitsで表示された731 + 168を計算し、回答欄が厳密に`899`になると開く。
 * - B08「異体数字 8」: Garay digitsで表示された842 + 157を計算し、回答欄が厳密に`999`になると開く。
 * - B09「異体数字 9」: Ol Chiki digitsで表示された913 + 286を計算し、回答欄が厳密に`1199`になると開く。
 * - B10「異体数字 10」: Mro digitsで表示された184 + 725を計算し、回答欄が厳密に`909`になると開く。
 * - B11「異体数字 11」: Wancho digitsで表示された295 + 613を計算し、回答欄が厳密に`908`になると開く。
 * - B12「異体数字 12」: Nag Mundari digitsで表示された376 + 522を計算し、回答欄が厳密に`898`になると開く。
 * - B13「異体数字 13」: Ol Onal digitsで表示された487 + 410を計算し、回答欄が厳密に`897`になると開く。
 * - B14「異体数字 14」: Sora Sompeng digitsで表示された598 + 307を計算し、回答欄が厳密に`905`になると開く。
 * - B15「異体数字 15」: Counting Rod Numeralsで表示された619 + 274を計算し、回答欄が厳密に`893`になると開く。
 * - B16「異体数字 16」: base-20 Kaktovik numeralsで表示された十進1352 + 1781を計算し、回答欄が厳密に`3133`になると開く。
 * - B17「異体数字 17」: 縦組みbase-20 Mayan numeralsで表示された十進2056 + 1023を計算し、回答欄が厳密に`3079`になると開く。
 * 使用API: Unicode 17.0固定fixture、Unicode code point、Font Loading APIのFontFace/Document.fonts、HTML numeric input。
 * 権限・privacy: 権限を要求せず、Git管理済みsubset fontと式だけを表示する。共通回答値は入場中のmemoryにだけ保持し、保存・送信しない。
 * 対応環境: FontFaceとDocument Font Setを実装し、BMP/補助平面のfixture glyphをsubset fontから描画できるbrowser。
 */
function S620Stage(props: Props) {
  const [answer, setAnswer] = useState("");
  const [fontReady, setFontReady] = useState(false);
  const [fontStatus, setFontStatus] = useState<"loading" | "unavailable" | "">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    const faces = [
      new FontFace(
        "BusycubeUnicode",
        `url(${
          new URL(
            "../../fixtures/unicode/fonts/unifont-17.0.05-bmp-subset.woff2",
            import.meta.url,
          ).href
        })`,
      ),
      new FontFace(
        "BusycubeUnicode",
        `url(${
          new URL(
            "../../fixtures/unicode/fonts/unifont-17.0.05-upper-subset.woff2",
            import.meta.url,
          ).href
        })`,
      ),
    ];
    void Promise.all(faces.map((face) => face.load()))
      .then((loaded) => {
        if (!active) return;
        loaded.forEach((face) => {
          document.fonts.add(face);
        });
        setFontReady(true);
        setFontStatus("");
      })
      .catch(() => {
        if (active) setFontStatus("unavailable");
      });
    return () => {
      active = false;
      faces.forEach((face) => {
        document.fonts.delete(face);
      });
    };
  }, []);

  return (
    <div className="puzzle">
      <div className="problem-row problem-row--wrap">
        {unicodeFixtures.map((fixture) => {
          const boxId = fixture.id as (typeof manifest.boxIds)[number];
          const problem = props.boxes[boxId];
          return (
            <StageProblemGiftBox
              key={boxId}
              box={problem}
              locale={props.locale}
            />
          );
        })}
      </div>
      <div
        className="encoding-question-grid"
        style={{ fontFamily: '"BusycubeUnicode", sans-serif' }}
      >
        {unicodeFixtures.map((fixture) => {
          const boxId = fixture.id as (typeof manifest.boxIds)[number];
          return (
            <article key={boxId} className="parallel-question-card">
              <strong>{boxId}</strong>
              <span>{unicodeExpressionText(fixture)}</span>
            </article>
          );
        })}
      </div>
      <label className="parallel-answer">
        {stageText(props.locale, locale.answer)}
        <input
          inputMode="numeric"
          value={answer}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setAnswer(next);
            const fixture = unicodeFixtures.find(
              (candidate) => String(candidate.answer) === next,
            );
            if (!fixture) return;
            const boxId = fixture.id as (typeof manifest.boxIds)[number];
            props.boxes[boxId].solve();
          }}
          disabled={!fontReady}
          aria-label={stageText(props.locale, locale.sharedAnswer)}
        />
      </label>
      <p className="interaction-status" role="status">
        {fontStatus === "loading"
          ? stageText(props.locale, locale.loadingFont)
          : fontStatus === "unavailable"
            ? stageText(props.locale, locale.unavailableFont)
            : null}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SelectAllOutlined,
      color: "#38bdf8",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: SelectAllOutlined,
      color: "#22d3ee",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: SelectAllOutlined,
      color: "#2dd4bf",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: SelectAllOutlined,
      color: "#34d399",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: SelectAllOutlined,
      color: "#4ade80",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: SelectAllOutlined,
      color: "#38bdf8",
      label: locale.B06,
    },
    [manifest.box.B07]: {
      icon: SelectAllOutlined,
      color: "#22d3ee",
      label: locale.B07,
    },
    [manifest.box.B08]: {
      icon: SelectAllOutlined,
      color: "#2dd4bf",
      label: locale.B08,
    },
    [manifest.box.B09]: {
      icon: SelectAllOutlined,
      color: "#34d399",
      label: locale.B09,
    },
    [manifest.box.B10]: {
      icon: SelectAllOutlined,
      color: "#4ade80",
      label: locale.B10,
    },
    [manifest.box.B11]: {
      icon: SelectAllOutlined,
      color: "#38bdf8",
      label: locale.B11,
    },
    [manifest.box.B12]: {
      icon: SelectAllOutlined,
      color: "#22d3ee",
      label: locale.B12,
    },
    [manifest.box.B13]: {
      icon: SelectAllOutlined,
      color: "#2dd4bf",
      label: locale.B13,
    },
    [manifest.box.B14]: {
      icon: SelectAllOutlined,
      color: "#34d399",
      label: locale.B14,
    },
    [manifest.box.B15]: {
      icon: SelectAllOutlined,
      color: "#4ade80",
      label: locale.B15,
    },
    [manifest.box.B16]: {
      icon: SelectAllOutlined,
      color: "#38bdf8",
      label: locale.B16,
    },
    [manifest.box.B17]: {
      icon: SelectAllOutlined,
      color: "#22d3ee",
      label: locale.B17,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "FontFace" in window && "CSS" in window ? "available" : "unsupported",
    ),
  Component: S620Stage,
});
