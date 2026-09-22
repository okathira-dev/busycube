import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-640",
  name: stageName,
  platform: { baseline: "widely", permission: "none" },
  boxes: ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
