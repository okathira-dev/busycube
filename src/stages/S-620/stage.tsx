import "./styles.css";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { useEffect, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import { type UnicodeFixture, unicodeFixtures } from "../../fixtures/unicode";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

function Operand({ text, fixture }: { text: string; fixture: UnicodeFixture }) {
  return fixture.layout === "mayan" ? (
    <span className="numeral-mayan" role="img" aria-label={text}>
      {(
        [
          { key: "high", index: 0 },
          { key: "middle", index: 1 },
          { key: "low", index: 2 },
        ] as const
      ).map((place) => (
        <span key={place.key}>{[...text][place.index]}</span>
      ))}
    </span>
  ) : (
    <bdi dir={fixture.direction}>{text}</bdi>
  );
}

/**
 * S-620
 *
 * 目的: 17種類の数字体系の三桁同士の固定加算を調べ、それぞれの箱の近くへ半角十進の答えを入力する。
 * 最初の一手: 箱に隣接した式を調べ、等号の右側へ計算結果を入力する。
 * 箱ごとの解法:
 * - B18「点線の四角」: そばのASCII / European digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算160+131で、入力が厳密に291へ一致すると開く。
 * - B19「点線の四角」: そばのArabic-Indic digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算319+293で、入力が厳密に612へ一致すると開く。
 * - B20「点線の四角」: そばのEastern Arabic-Indic digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算912+903で、入力が厳密に1815へ一致すると開く。
 * - B21「点線の四角」: そばのHan numeralsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算938+425で、入力が厳密に1363へ一致すると開く。
 * - B22「点線の四角」: そばのOsmanya digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算486+711で、入力が厳密に1197へ一致すると開く。
 * - B23「点線の四角」: そばのAdlam digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算679+959で、入力が厳密に1638へ一致すると開く。
 * - B24「点線の四角」: そばのN'Ko digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算957+717で、入力が厳密に1674へ一致すると開く。
 * - B25「点線の四角」: そばのGaray digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算320+541で、入力が厳密に861へ一致すると開く。
 * - B26「点線の四角」: そばのOl Chiki digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算864+193で、入力が厳密に1057へ一致すると開く。
 * - B27「点線の四角」: そばのMro digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算547+938で、入力が厳密に1485へ一致すると開く。
 * - B28「点線の四角」: そばのWancho digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算635+253で、入力が厳密に888へ一致すると開く。
 * - B29「点線の四角」: そばのNag Mundari digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算869+216で、入力が厳密に1085へ一致すると開く。
 * - B30「点線の四角」: そばのOl Onal digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算705+499で、入力が厳密に1204へ一致すると開く。
 * - B31「点線の四角」: そばのSora Sompeng digitsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算935+261で、入力が厳密に1196へ一致すると開く。
 * - B32「点線の四角」: そばのCounting Rod Numeralsの式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算593+979で、入力が厳密に1572へ一致すると開く。
 * - B33「点線の四角」: そばのKaktovik numerals（20進数）の式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算2690+5740で、入力が厳密に8430へ一致すると開く。
 * - B34「点線の四角」: そばのMayan numerals（縦組み20進数）の式を調べて計算し、等号の右へ半角十進数で入力する。今回の固定式は十進換算6079+4220で、入力が厳密に10299へ一致すると開く。
 * 使用API: Unicode固定fixture、FontFace/Document.fonts、HTML input。問題は開発時に一度乱数生成し、入場ごとには変更しない。
 * 権限・privacy: 権限を要求せず、同梱subset fontを読み込む。回答はこの挑戦中だけに保持し保存・送信しない。
 * 対応環境: Font Loading APIと補助平面を含むUnicodeを描画できるブラウザー。
 */
function S620Stage(props: Props) {
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [fontReady, setFontReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const faces = [
      new FontFace(
        "BusycubeUnicode",
        `url(${new URL("../../fixtures/unicode/fonts/unifont-17.0.05-bmp-subset.woff2", import.meta.url).href})`,
      ),
      new FontFace(
        "BusycubeUnicode",
        `url(${new URL("../../fixtures/unicode/fonts/unifont-17.0.05-upper-subset.woff2", import.meta.url).href})`,
      ),
    ];
    void Promise.all(faces.map((face) => face.load()))
      .then((loaded) => {
        if (!active || props.signal.aborted) return;
        for (const face of loaded) document.fonts.add(face);
        setFontReady(true);
      })
      .catch(() => {
        if (active && !props.signal.aborted) setFailed(true);
      });
    const stop = () => {
      active = false;
      for (const face of faces) document.fonts.delete(face);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  return (
    <div className="puzzle">
      <div className="numeral-problems">
        {unicodeFixtures.map((fixture) => {
          const id = manifest.boxIds.find((boxId) => boxId === fixture.id);
          if (!id) throw new Error("Missing Unicode box");
          return (
            <article className="numeral-problem" key={id}>
              <StageProblemGiftBox
                box={props.boxes[id]}
                locale={props.locale}
              />
              <div className="numeral-equation">
                <Operand text={fixture.leftText} fixture={fixture} />
                <span>+</span>
                <Operand text={fixture.rightText} fixture={fixture} />
                <span>=</span>
                <input
                  aria-label={stageText(props.locale, locale.answer)}
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={answers[id] ?? ""}
                  disabled={!fontReady}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setAnswers((current) => ({ ...current, [id]: value }));
                    if (
                      !props.signal.aborted &&
                      value === String(fixture.answer)
                    )
                      props.boxes[id].solve();
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
      {!fontReady && (
        <p role="status">
          {stageText(
            props.locale,
            failed ? locale.unavailableFont : locale.loadingFont,
          )}
        </p>
      )}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B18]: {
      icon: SelectAllOutlined,
      tone: "cyan",
      label: locale.box,
    },
    [manifest.box.B19]: {
      icon: SelectAllOutlined,
      tone: "green",
      label: locale.box,
    },
    [manifest.box.B20]: {
      icon: SelectAllOutlined,
      tone: "blue",
      label: locale.box,
    },
    [manifest.box.B21]: {
      icon: SelectAllOutlined,
      tone: "violet",
      label: locale.box,
    },
    [manifest.box.B22]: {
      icon: SelectAllOutlined,
      tone: "amber",
      label: locale.box,
    },
    [manifest.box.B23]: {
      icon: SelectAllOutlined,
      tone: "cyan",
      label: locale.box,
    },
    [manifest.box.B24]: {
      icon: SelectAllOutlined,
      tone: "green",
      label: locale.box,
    },
    [manifest.box.B25]: {
      icon: SelectAllOutlined,
      tone: "blue",
      label: locale.box,
    },
    [manifest.box.B26]: {
      icon: SelectAllOutlined,
      tone: "violet",
      label: locale.box,
    },
    [manifest.box.B27]: {
      icon: SelectAllOutlined,
      tone: "amber",
      label: locale.box,
    },
    [manifest.box.B28]: {
      icon: SelectAllOutlined,
      tone: "cyan",
      label: locale.box,
    },
    [manifest.box.B29]: {
      icon: SelectAllOutlined,
      tone: "green",
      label: locale.box,
    },
    [manifest.box.B30]: {
      icon: SelectAllOutlined,
      tone: "blue",
      label: locale.box,
    },
    [manifest.box.B31]: {
      icon: SelectAllOutlined,
      tone: "violet",
      label: locale.box,
    },
    [manifest.box.B32]: {
      icon: SelectAllOutlined,
      tone: "amber",
      label: locale.box,
    },
    [manifest.box.B33]: {
      icon: SelectAllOutlined,
      tone: "cyan",
      label: locale.box,
    },
    [manifest.box.B34]: {
      icon: SelectAllOutlined,
      tone: "green",
      label: locale.box,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "FontFace" in window && "fonts" in document ? "available" : "unsupported",
    ),
  Component: S620Stage,
});
