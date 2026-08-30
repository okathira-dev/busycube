import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { SensorStageShell, useStageSensor } from "../shared/sensorStage";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-540
 *
 * 目的: ambient light sensorが報告するilluminanceの暗所側と強光側という離れた二つの閾値を実環境で観測する。
 * 最初の一手: 「センサーを開始」を押し、sensorを完全に覆って暗くする。B02は十分に明るい屋外光などへsensorを向ける。
 * 箱ごとの解法:
 * - B01「暗闇の箱」: AmbientLightSensor readingの`illuminance`がnullでなく5 lux以下なら開く。
 * - B02「眩光の箱」: 同じsensorの`illuminance`がnullでなく10,000 lux以上なら開く。別訪問で得た両端も通常進捗へ累積できる。
 * 使用API: Generic Sensor APIの`AmbientLightSensor({frequency:5})`とilluminance reading。
 * 権限・privacy: light sensor accessは明示buttonから開始し、lux値は閾値判定にだけ使う。照度値・時刻・場所を保存・送信しない。
 * 対応環境: AmbientLightSensorと実照度readingをpageへ公開するbrowser/端末、および各閾値を作れる照明環境。
 */
function S540Stage(props: Props) {
  const dark = props.boxes[manifest.box.B01];
  const bright = props.boxes[manifest.box.B02];
  const sensor = useStageSensor(
    props,
    () => new AmbientLightSensor({ frequency: 5 }),
    (value) => {
      if (value.illuminance !== null && value.illuminance <= 5) dark.solve();
      if (value.illuminance !== null && value.illuminance >= 10000)
        bright.solve();
    },
  );
  return (
    <SensorStageShell props={props} {...sensor}>
      <StageProblemGiftBox box={dark} locale={props.locale} />
      <StageProblemGiftBox box={bright} locale={props.locale} />
    </SensorStageShell>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: LightModeOutlined,
      color: "#0f172a",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: LightModeOutlined,
      color: "#fef08a",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "AmbientLightSensor" in window ? "permission-required" : "unsupported",
    ),
  Component: S540Stage,
});
