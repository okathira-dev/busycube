import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-240",
  name: stageName,
  platform: { baseline: "widely", permission: "required" },
  boxes: ["B03"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
