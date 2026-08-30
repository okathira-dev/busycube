import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const selectOptions = [
  ...Array.from(
    { length: 24 },
    (_, index) => `item-${String(index + 1).padStart(2, "0")}`,
  ),
  "open busycube",
  ...Array.from(
    { length: 24 },
    (_, index) => `item-${String(index + 25).padStart(2, "0")}`,
  ),
];

/**
 * S-150
 *
 * 目的: native HTML controlsのfocus、select選択、同名detailsの排他toggleという三種類の標準UI挙動を使う。
 * 最初の一手: Tabで最初のbuttonへfocusを移し、次にselectで`open busycube`を選び、最後にA/B/Cのdetailsを二つ以上順番に開く。
 * 箱ごとの解法:
 * - B01「フォーカスの箱」: 「見えない入口」buttonがfocusを受けるか、button自身がclickされると開く。
 * - B02「選択の箱」: 49項目のnative selectで中央の`open busycube`を選び、change時のvalueが完全一致すると開く。
 * - B03「排他表示の箱」: 同じ`name`を持つA/B/Cのdetailsでtoggleを2回以上発生させ、その時点でopenなdetailsがちょうど1個なら開く。
 * 使用API: HTMLButtonElementのfocus/click、HTMLSelectElementのchangeとnative typeahead、`details` / `summary` / `name`の排他accordion挙動。
 * 権限・privacy: 権限を要求せず、選択値とtoggle回数はこのattemptの判定にだけ使って保存・送信しない。
 * 対応環境: keyboard focus、native select、details toggleを実装するbrowser。capability判定では`MutationObserver`も必要とする。
 */
function S150Stage(props: Props) {
  const focusProblem = props.boxes[manifest.box.B01];
  const selectProblem = props.boxes[manifest.box.B02];
  const detailsProblem = props.boxes[manifest.box.B03];
  const detailsRef = useRef<HTMLDivElement>(null);
  const detailToggleCount = useRef(0);

  useEffect(() => {
    const container = detailsRef.current;
    if (!container) return;
    const details = Array.from(container.querySelectorAll("details"));
    const inspect = () => {
      detailToggleCount.current += 1;
      const openCount = details.filter((item) => item.open).length;
      if (detailToggleCount.current > 1 && openCount === 1)
        detailsProblem.solve();
    };
    details.forEach((item) => {
      item.addEventListener("toggle", inspect);
    });
    return () => {
      details.forEach((item) => {
        item.removeEventListener("toggle", inspect);
      });
    };
  }, [detailsProblem.solve]);

  return (
    <div className="puzzle puzzle--centered accessibility-puzzle">
      <p className="measurement">{stageText(props.locale, locale.clue)}</p>
      <button
        type="button"
        className="stage-action accessibility-keyboard-button"
        onFocus={() => focusProblem.solve()}
        onClick={() => focusProblem.solve()}
      >
        {stageText(props.locale, locale.focusButton)}
      </button>
      <label className="accessibility-select">
        {stageText(props.locale, locale.selectLabel)}
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.currentTarget.value === "open busycube")
              selectProblem.solve();
          }}
        >
          <option value="" disabled>
            {stageText(props.locale, locale.selectPlaceholder)}
          </option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div ref={detailsRef} className="accessibility-details">
        {(["A", "B", "C"] as const).map((name) => (
          <details key={name} name="busycube-exclusive-details">
            <summary>{name}</summary>
            <p>{name}</p>
          </details>
        ))}
      </div>
      <div className="problem-row">
        <StageProblemGiftBox box={focusProblem} locale={props.locale} />
        <StageProblemGiftBox box={selectProblem} locale={props.locale} />
        <StageProblemGiftBox box={detailsProblem} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VisibilityOffOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: SelectAllOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: AccountTreeOutlined,
      color: "#8b5cf6",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "MutationObserver" in window ? "available" : "unsupported",
    ),
  Component: S150Stage,
});
