import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-400",
  name: stageName,
  platform: { baseline: "newly", permission: "none" },
  boxes: ["B01", "B02"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
