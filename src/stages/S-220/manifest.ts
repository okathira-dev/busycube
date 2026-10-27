import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-220",
  name: stageName,
  platform: { baseline: "newly", permission: "none" },
  boxes: ["B05", "B03", "B06"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
