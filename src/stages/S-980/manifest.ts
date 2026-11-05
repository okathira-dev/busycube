import {
  defineStageManifest,
  type StageModule,
} from "../../runtime/stageContract";
export const manifest = defineStageManifest({
  id: "S-980",
  name: { ja: "ゴースティング", en: "Ghosting" },
  platform: { baseline: "widely", permission: "none" },
  boxes: ["B01"],
  load: async (): Promise<StageModule> => (await import("./stage")).stage,
});
