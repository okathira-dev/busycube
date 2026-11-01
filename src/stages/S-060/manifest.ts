import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";

export const manifest = defineStageManifest({
  id: "S-060",
  name: { ja: "戻って", en: "Come back" },
  platform: { baseline: "widely", permission: "none" },
  boxes: ["B03"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
