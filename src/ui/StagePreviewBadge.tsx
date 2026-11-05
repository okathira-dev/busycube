import Chip from "@mui/material/Chip";
import type { Locale } from "../i18n";
import type { StageAccessKind } from "../runtime/stageContract";
import { uiText } from "./locale";

export function StagePreviewBadge({
  accessKind,
  locale,
}: {
  accessKind: StageAccessKind;
  locale: Locale;
}) {
  if (accessKind === "baseline-direct") return null;
  return (
    <Chip
      component="span"
      size="small"
      variant="outlined"
      color="warning"
      label={uiText(locale, "stagePreview")}
    />
  );
}
