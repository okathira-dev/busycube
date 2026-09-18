import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-650",
  name: stageName,
  platform: { baseline: "widely", permission: "required" },
  boxes: ["B01", "B02", "B03", "B04"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
