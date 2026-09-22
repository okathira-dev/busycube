import { mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default mergeConfig(baseConfig, {
  test: {
    coverage: {
      include: [
        "src/domain/**/*.ts",
        "src/drive/driveBackup.ts",
        "src/hooks/**/*.ts",
        "src/runtime/stageContract.ts",
        "src/ui/MainTabs.tsx",
        "src/ui/ProgressStorageAlert.tsx",
        "src/ui/appRoute.ts",
        "src/ui/pageMetadata.ts",
        "src/ui/progressImport.ts",
        "src/ui/stageCatalogueModel.ts",
      ],
      reporter: ["text"],
      thresholds: {
        statements: 75,
        branches: 63,
        functions: 78,
        lines: 78,
      },
    },
  },
});
