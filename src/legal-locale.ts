const locale =
  new URL(window.location.href).searchParams.get("locale") === "en"
    ? "en"
    : "ja";

document.documentElement.lang = locale;
document.title =
  locale === "ja"
    ? (document.documentElement.dataset.titleJa ?? document.title)
    : (document.documentElement.dataset.titleEn ?? document.title);

const description = document.querySelector<HTMLMetaElement>(
  'meta[name="description"]',
);
const localizedDescription =
  locale === "ja"
    ? document.documentElement.dataset.descriptionJa
    : document.documentElement.dataset.descriptionEn;
if (description && localizedDescription) {
  description.content = localizedDescription;
}

for (const localized of document.querySelectorAll<HTMLElement>(
  "[data-locale]",
)) {
  localized.hidden = localized.dataset.locale !== locale;
}

for (const link of document.querySelectorAll<HTMLAnchorElement>(
  "[data-preserve-locale]",
)) {
  const url = new URL(link.href, window.location.href);
  url.searchParams.set("locale", locale);
  link.href = url.href;
}

for (const link of document.querySelectorAll<HTMLAnchorElement>(
  "[data-locale-choice]",
)) {
  if (link.dataset.localeChoice === locale) {
    link.setAttribute("aria-current", "page");
  }
}
