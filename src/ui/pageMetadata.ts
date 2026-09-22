import { type Locale, messages, productCopy } from "../i18n";
import type { MainView } from "./appRoute";

interface PageMetadataInput {
  locale: Locale;
  view: MainView;
  stageName?: string;
  displayCode?: string;
}

export function pageMetadata({
  locale,
  view,
  stageName,
  displayCode,
}: PageMetadataInput): { title: string; description: string } {
  const copy = messages[locale];
  const section = stageName
    ? [displayCode, stageName].filter(Boolean).join(" ")
    : {
        stages: copy.stages,
        settings: copy.settings,
        about: copy.aboutTab,
      }[view];
  return {
    title: `${section} | ${productCopy.fullTitle}`,
    description: copy.metaDescription,
  };
}
