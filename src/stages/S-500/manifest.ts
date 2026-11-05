import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-500",
  name: stageName,
  platform: { baseline: "widely", permission: "required" },
  boxes: ["B02"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
