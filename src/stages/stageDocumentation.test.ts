import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stageIndex } from "../runtime/stage-index.generated";

const stageDirectory = join(process.cwd(), "src", "stages");
const stageIds = readdirSync(stageDirectory)
  .filter((name) => /^S-\d{3}$/.test(name))
  .sort();

describe("stage documentation coverage", () => {
  it("keeps every shipped stage beside a locale bundle and MECE Japanese solution JSDoc", () => {
    expect(stageIds).toEqual(stageIndex.map((stage) => stage.id));
    for (const [index, id] of stageIds.entries()) {
      const source = readFileSync(
        join(stageDirectory, id, "stage.tsx"),
        "utf8",
      );
      const localeSource = readFileSync(
        join(stageDirectory, id, "locale.ts"),
        "utf8",
      );
      expect(localeSource).toMatch(/ja:/);
      expect(localeSource).toMatch(/en:/);
      expect(source).not.toContain(
        "の箱が示すブラウザ固有の状態・イベント・データ受け渡し",
      );
      expect(localeSource).not.toContain(
        "このステージのブラウザ挙動を観察する",
      );
      expect(localeSource).not.toContain(
        "Observe the browser behavior in this stage",
      );
      expect(localeSource).not.toMatch(/^\s+hint:/m);
      const jaKeys = [
        ...localeSource.matchAll(/^\s+(\w+):\s*\{[\s\S]*?\bja:/gm),
      ]
        .map((match) => match[1])
        .sort();
      const enKeys = [
        ...localeSource.matchAll(/^\s+(\w+):\s*\{[\s\S]*?\ben:/gm),
      ]
        .map((match) => match[1])
        .sort();
      expect(jaKeys).toEqual(enKeys);
      expect(source).not.toContain("Gimmick:");
      const documentation = [...source.matchAll(/\/\*\*[\s\S]*?\*\//g)].map(
        (match) => match[0],
      );
      expect(documentation).toHaveLength(1);
      const stageJSDoc = documentation[0] ?? "";
      const boxIds = stageIndex[index]?.boxIds ?? [];
      const documentedBoxIds = [
        ...stageJSDoc.matchAll(/^\s*\*\s*-\s*(B\d{2})\b/gm),
      ].map((match) => match[1]);
      expect(stageJSDoc).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      expect(stageJSDoc).toContain("目的:");
      expect(stageJSDoc).toContain("最初の一手:");
      expect(stageJSDoc).toMatch(/箱ごとの(?:解法|成功条件):/);
      expect(stageJSDoc).toMatch(/(?:使用API:|API\/権限:)/);
      expect(stageJSDoc).toMatch(/(?:権限・privacy:|API\/権限:)/);
      expect(stageJSDoc).toContain("対応環境:");
      expect(documentedBoxIds).toEqual(boxIds);
      for (const boxId of boxIds) {
        expect(stageJSDoc).toMatch(
          new RegExp(`^\\s*\\*\\s*-\\s*${boxId}[^:]*:\\s*.{20,}$`, "m"),
        );
      }
      expect(stageJSDoc).not.toContain("開かない操作:");
      expect(stageJSDoc).not.toMatch(/(?:cleanup:|cleanup\/環境:)/);
      expect(stageJSDoc).not.toMatch(/(?:人手確認:|H-\d{3})/);
      expect(stageJSDoc).not.toContain("問題定義にある各Bxx");
      expect(stageJSDoc).not.toContain("画面の箱と説明を確認し");
      expect(stageJSDoc).not.toMatch(/S-\d{3}の判定に必要な実装内のWeb API/);
      expect(stageJSDoc).not.toContain(
        "実装が必要とする権限・保存・送信は、箱の操作に必要な最小範囲へ限定する",
      );
      expect(stageJSDoc).not.toContain(
        "StageHostのcapability probeがavailableまたはpermission-requiredとしたブラウザ",
      );
    }
  });
});
