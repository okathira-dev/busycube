import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-490
 *
 * 目的: 自由入力欄へstage名の正規形を置き、caseや空白を補正しない完全一致を確認する。
 * 最初の一手: 箱の下のtext inputへ半角小文字で`busycube`と入力する。
 * 箱ごとの解法:
 * - B01「busycubeの箱」: inputのchangeごとに現在valueを読み、値が厳密に8文字の`busycube`と一致した時点で開く。
 * 使用API: HTML text inputとReactのcontrolled `onChange` event。
 * 権限・privacy: 権限を要求せず、入力値はこのcomponentのmemory内表示・一致判定にだけ使い、保存・送信しない。
 * 対応環境: 標準HTML text inputへkeyboard、IME、paste等で文字列を入力できる一般的なbrowser。
 */
function S490Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [value, setValue] = useState("");
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <input
        className="paste-target"
        value={value}
        placeholder={stageText(props.locale, locale.answerPlaceholder)}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setValue(next);
          if (next === "busycube") problem.solve();
        }}
      />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: AccountTreeOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () => "available",
  Component: S490Stage,
});
