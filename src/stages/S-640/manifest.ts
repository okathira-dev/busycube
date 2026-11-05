import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-640",
  name: stageName,
  platform: { baseline: "widely", permission: "none" },
  boxes: ["B01", "B09", "B10", "B11", "B12", "B13", "B14", "B15"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
