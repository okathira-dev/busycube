import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-800",
  name: stageName,
  platform: { baseline: "widely", permission: "none" },
  boxes: ["B02", "B01"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
