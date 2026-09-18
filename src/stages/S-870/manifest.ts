import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
import { stageName } from "./name";

export const manifest = defineStageManifest({
  id: "S-870",
  name: stageName,
  platform: { baseline: "widely", permission: "required" },
  boxes: ["B01", "B02", "B03"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
