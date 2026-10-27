import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-620",
  name: stageName,
  platform: { baseline: "widely", permission: "none" },
  boxes: [
    "B18",
    "B19",
    "B20",
    "B21",
    "B22",
    "B23",
    "B24",
    "B25",
    "B26",
    "B27",
    "B28",
    "B29",
    "B30",
    "B31",
    "B32",
    "B33",
    "B34",
  ],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
