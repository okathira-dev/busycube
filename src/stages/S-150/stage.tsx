import "./styles.css";
import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import { createSvgIcon } from "@mui/material/utils";
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

const SelectMenuIcon = createSvgIcon(
  <>
    <rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M5 11h7v2H5zm10-1 3 4 3-4z" />
  </>,
  "SelectMenu",
);

const AccordionIcon = createSvgIcon(
  <>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M3 9h18M3 15h18m-7-9 2 1 2-1m-4 6 2 1 2-1m-4 6 2 1 2-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>,
  "Accordion",
);

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
 * 目的: ポインター操作を受け付けない三つの対象へキーボードで移動し、選択を確定する。
 * 最初の一手: Tabで箱へフォーカスを移し、EnterまたはSpaceで確定する。
 * 箱ごとの解法:
 * - B04「エンターキー」: Tabで箱へフォーカスを移し、EnterまたはSpaceで押す。箱自身のkeyboard clickで開き、focusだけでは開かない。
 * - B05「セレクトメニュー」: native selectでopen busycubeをキーボード選択し、Enterで確定する。Enterのkeydown時にvalueが完全一致すると開く。changeだけでは開かない。
 * - B06「アコーディオン」: A/B/Cのaccordionをキーボードで開き、B内の星のボタンをTabで選んでEnterまたはSpaceで押す。A/C内のバツのボタンはdisabledで、開いているdetails内の当たりbuttonのkeyboard clickで開く。
 * 使用API: native buttonのkeyboard click、HTMLSelectElementのvalue/keydown、同じnameを持つdetails/summary。
 * 権限・privacy: 権限を要求せず、選択値はこの挑戦中の判定にだけ使用し保存・送信しない。
 * 対応環境: キーボードによるfocus・native select・details操作を実装するブラウザー。
 */
function S150Stage(props: Props) {
  const focusProblem = props.boxes.B04;
  const selectProblem = props.boxes.B05;
  const detailsProblem = props.boxes.B06;
  return (
    <div className="puzzle puzzle--centered accessibility-puzzle">
      <div className="keyboard-control">
        <StageProblemGiftBox
          box={focusProblem}
          locale={props.locale}
          onClick={(event) => {
            if (event.detail === 0 && !props.signal.aborted)
              focusProblem.solve();
          }}
        />
      </div>
      <div className="accessibility-select keyboard-control">
        <StageProblemGiftBox box={selectProblem} locale={props.locale} />
        <select
          aria-label={stageText(props.locale, locale.menu)}
          defaultValue=""
          size={7}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (
              event.key === "Enter" &&
              event.currentTarget.value === "open busycube" &&
              !props.signal.aborted
            )
              selectProblem.solve();
          }}
        >
          <option value="" disabled>
            —
          </option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="accessibility-details keyboard-control">
        <StageProblemGiftBox box={detailsProblem} locale={props.locale} />
        {(["A", "B", "C"] as const).map((name) => (
          <details key={name} name="busycube-exclusive-details">
            <summary>{name}</summary>
            <button
              type="button"
              className="stage-action"
              disabled={name !== "B"}
              aria-label={stageText(
                props.locale,
                name === "B" ? locale.star : locale.cross,
              )}
              onClick={(event) => {
                if (
                  event.detail === 0 &&
                  event.currentTarget.closest("details")?.open &&
                  !props.signal.aborted
                )
                  detailsProblem.solve();
              }}
            >
              {name === "B" ? "☆" : "✗"}
            </button>
          </details>
        ))}
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B04]: {
      icon: KeyboardReturnOutlined,
      tone: "violet",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: SelectMenuIcon,
      tone: "violet",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: AccordionIcon,
      tone: "violet",
      label: locale.B06,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "HTMLDetailsElement" in window ? "available" : "unsupported",
    ),
  Component: S150Stage,
});
