import "./styles.css";
import ContactPageOutlined from "@mui/icons-material/ContactPageOutlined";
import { createSvgIcon } from "@mui/material/utils";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { stageText } from "../locale";
import {
  type ContactInfoLike,
  hasNoSharedS760Properties,
  matchesS760Card,
} from "./functions";
import { locale } from "./locale";

export type ContactsManagerLike = {
  select(
    properties: readonly string[],
    options: { multiple: false },
  ): Promise<ContactInfoLike[]>;
};

const properties = ["name", "email", "tel", "address", "icon"] as const;
const ContactCardOff = createSvgIcon(
  <>
    <path
      d="M5 3h14v18H5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="8" r="2" />
    <path d="M8 17v-2a4 3 0 0 1 8 0v2Z" />
    <path d="m2 2 20 20" fill="none" stroke="currentColor" strokeWidth="2" />
  </>,
  "ContactCardOff",
);

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
 * 最初の一手: 架空名刺を見て、連絡先カードの箱を押し、OSのContact Pickerを開く。
 * 箱ごとの解法:
 * - B01「連絡先カード」: 名刺どおりの架空連絡先を用意して箱からpickerを開き、一件を共有する。name、case-insensitive email、正規化tel `+81300000000`、address内4 tokenが一致し、size 0超のicon Blobがあれば開く。画像内容の一致は判定しない。
 * - B02「斜線入りの連絡先カード」: 箱から同じpickerを開き、一件を選んで五項目すべてを伏せる。要求するname/email/tel/address/iconは両箱とも同じで、返却contact一件の五propertyがすべて欠損または空配列なら開く。取消/返却0件は達成しない。
 * 使用API: Contact Picker APIの`navigator.contacts.select()`、ContactInfo arrays、structured address、Blob icon。
 * 権限・privacy: 箱の明示操作でだけpickerを開く。返却contactは一回のboolean照合後に破棄し、名前・email・電話・住所・画像をDOM/console/storage/serverへ残さない。架空連絡先の利用とOS側での後片付けは設定画面の共通説明へ案内する。
 * 対応環境: secure contextでContact Pickerとproperty単位の共有制御を提供するAndroid等のbrowser/OS。
 */
function S760Stage(props: Props) {
  const fullProblem = props.boxes[manifest.box.B01];
  const emptyProblem = props.boxes[manifest.box.B02];
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = !props.signal.aborted;
    const dispose = () => {
      active.current = false;
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);

  const select = async (emptyMode: boolean) => {
    if (!active.current || props.signal.aborted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus(statusText(props.locale, "waiting"));
    try {
      const contacts = (
        navigator as Navigator & { contacts?: ContactsManagerLike }
      ).contacts;
      if (!contacts?.select) {
        setStatus(statusText(props.locale, "unavailable"));
        return;
      }
      const result = await contacts.select(properties, { multiple: false });
      if (!active.current || props.signal.aborted) return;
      if (result.length === 0) {
        setStatus(statusText(props.locale, "cancelled"));
        return;
      }
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
    } catch (error) {
      if (!active.current || props.signal.aborted) return;
      const reason: CommonStatus =
        error instanceof DOMException && error.name === "AbortError"
          ? "cancelled"
          : error instanceof DOMException &&
              (error.name === "NotAllowedError" ||
                error.name === "SecurityError")
            ? "denied"
            : error instanceof DOMException &&
                error.name === "NotSupportedError"
              ? "unavailable"
              : "error";
      setStatus(statusText(props.locale, reason));
    } finally {
      pending.current = false;
      if (active.current && !props.signal.aborted) setBusy(false);
    }
  };

  const image = iconUrl();
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row" aria-busy={busy}>
        <StageProblemGiftBox
          box={fullProblem}
          locale={props.locale}
          onClick={() => void select(false)}
        />
        <StageProblemGiftBox
          box={emptyProblem}
          locale={props.locale}
          onClick={() => void select(true)}
        />
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
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ContactPageOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: ContactCardOff,
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
