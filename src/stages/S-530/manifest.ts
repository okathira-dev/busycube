import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-530",
  name: stageName,
  platform: { baseline: "widely", permission: "required" },
  boxes: ["B04", "B05", "B06"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
