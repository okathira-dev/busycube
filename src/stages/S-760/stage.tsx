import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
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
import { stageText } from "../locale";
import {
  type ContactInfoLike,
  hasNoSharedS760Properties,
  matchesS760Card,
} from "./functions";
import { locale } from "./locale";

type ContactsManagerLike = {
  select(
    properties: readonly string[],
    options: { multiple: false },
  ): Promise<ContactInfoLike[]>;
};

const properties = ["name", "email", "tel", "address", "icon"] as const;

function iconUrl(): string {
  return new URL(
    "contact/courier-icon.svg",
    new URL(import.meta.env.BASE_URL, location.origin),
  ).href;
}

/**
 * S-760
 *
 * 目的: OS Contact Pickerで架空contactの5 propertyを共有した結果と、contactを一件選びながら全propertyを伏せた結果を対比する。
 * 最初の一手: 画面の名刺どおりに`Busycube Courier`を端末連絡先へ登録し、iconも保存・設定して「5項目を共有」を押す。
 * 箱ごとの解法:
 * - B01「全項目の箱」: pickerが一件を返し、name、case-insensitive email、正規化tel `+81300000000`、address内4 token、size 0超icon Blobがすべて名刺と一致すると開く。
 * - B02「非共有の箱」: 同じname/email/tel/address/iconを要求するpickerで一件を選び、返却contactの五propertyがすべて欠損または空配列なら開く。
 * 使用API: Contact Picker APIの`navigator.contacts.select()`、ContactInfo arrays、structured address、Blob icon。
 * 権限・privacy: 返却contactは一回のboolean照合後に破棄し、名前・email・電話・住所・画像をDOM/console/storage/serverへ残さない。作成contactの削除はOS連絡先側で行う。
 * 対応環境: secure contextでContact Pickerとproperty単位の共有制御を提供するAndroid等のbrowser/OS。
 */
function S760Stage(props: Props) {
  const fullProblem = props.boxes[manifest.box.B01];
  const emptyProblem = props.boxes[manifest.box.B02];
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );

  const select = async (emptyMode: boolean) => {
    const contacts = (
      navigator as Navigator & { contacts?: ContactsManagerLike }
    ).contacts;
    if (!contacts?.select) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    try {
      const result = await contacts.select(properties, { multiple: false });
      const contact = result.length === 1 ? result[0] : undefined;
      if (emptyMode && hasNoSharedS760Properties(contact)) {
        emptyProblem.solve();
        setStatus(stageText(props.locale, locale.emptySuccess));
      } else if (!emptyMode && matchesS760Card(contact)) {
        fullProblem.solve();
        setStatus(stageText(props.locale, locale.fullSuccess));
      } else {
        setStatus(stageText(props.locale, locale.mismatch));
      }
    } catch {
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  const image = iconUrl();
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={fullProblem} locale={props.locale} />
        <StageProblemGiftBox box={emptyProblem} locale={props.locale} />
      </div>
      <article className="s760-card">
        <img
          src={image}
          alt={stageText(props.locale, locale.iconAlt)}
          width={512}
          height={512}
        />
        <dl>
          <dt>{stageText(props.locale, locale.nameLabel)}</dt>
          <dd>Busycube Courier</dd>
          <dt>{stageText(props.locale, locale.emailLabel)}</dt>
          <dd>courier@busycube.invalid</dd>
          <dt>{stageText(props.locale, locale.telLabel)}</dt>
          <dd>+81 3-0000-0000</dd>
          <dt>{stageText(props.locale, locale.addressLabel)}</dt>
          <dd>1-1-1 Busycube, Tokyo 100-0001, Japan</dd>
          <dt>{stageText(props.locale, locale.iconLabel)}</dt>
          <dd>
            <a href={image} download="busycube-courier.svg">
              {stageText(props.locale, locale.saveIcon)}
            </a>
          </dd>
        </dl>
      </article>
      <p>{stageText(props.locale, locale.idle)}</p>
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          onClick={() => void select(false)}
        >
          {stageText(props.locale, locale.full)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => void select(true)}
        >
          {stageText(props.locale, locale.empty)}
        </button>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DevicesOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: VisibilityOffOutlined,
      color: "#94a3b8",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "contacts" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S760Stage,
});
