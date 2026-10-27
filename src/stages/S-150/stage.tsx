import "./styles.css";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
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
 * - B04「斜線入りの目」: Tabで箱へフォーカスを移し、EnterまたはSpaceで押す。箱自身のkeyboard clickで開き、focusだけでは開かない。
 * - B05「点線の四角」: native selectでopen busycubeをキーボード選択し、Enterで確定する。Enterのkeydown時にvalueが完全一致すると開く。changeだけでは開かない。
 * - B06「枝分かれした線」: A/B/Cのaccordionをキーボードで開き、中にある丸いボタンをTabで選んでEnterまたはSpaceで押す。開いているdetails内の当たりbuttonのkeyboard clickで開く。
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
            {name === "B" ? (
              <button
                type="button"
                className="stage-action"
                aria-label={stageText(props.locale, locale.circle)}
                onClick={(event) => {
                  if (
                    event.detail === 0 &&
                    event.currentTarget.closest("details")?.open &&
                    !props.signal.aborted
                  )
                    detailsProblem.solve();
                }}
              >
                ●
              </button>
            ) : (
              <span aria-hidden="true">○</span>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B04]: {
      icon: VisibilityOffOutlined,
      tone: "violet",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: SelectAllOutlined,
      tone: "violet",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: AccountTreeOutlined,
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
