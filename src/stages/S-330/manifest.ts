import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-330",
  name: stageName,
  platform: { baseline: "newly", permission: "none" },
  boxes: ["B03"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
