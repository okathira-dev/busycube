import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
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

import { useRef } from "react";

/**
 * S-520
 *
 * 目的: 端末のproximity sensorで対象が遠い状態から近い状態へ変化した順序を観測する。
 * 最初の一手: 「センサーを開始」を押し、sensorから物を離してfarを読ませた後、手や物をsensorのすぐ近くへ寄せる。
 * 箱ごとの解法:
 * - B01「近接の箱」: 10 HzのProximitySensor readingで一度`near === false`を観測した後、同じattemptで`near === true`を観測すると開く。
 * 使用API: Generic Sensor APIのProximitySensor、reading/error events、start/stop。
 * 権限・privacy: sensor権限は明示buttonから利用し、near booleanだけを順序判定する。距離・物体情報・reading履歴を保存・送信しない。
 * 対応環境: ProximitySensorを公開し、近接sensor権限と実readingを提供するbrowser/端末。
 */
function S520Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const sawFar = useRef(false);
  const sensor = useStageSensor(
    props,
    () => new ProximitySensor({ frequency: 10 }),
    (value) => {
      if (value.near === false) sawFar.current = true;
      if (sawFar.current && value.near === true) problem.solve();
    },
  );
  return (
    <SensorStageShell props={props} {...sensor}>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </SensorStageShell>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DevicesOutlined,
      color: "#f472b6",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "ProximitySensor" in window ? "permission-required" : "unsupported",
    ),
  Component: S520Stage,
});
