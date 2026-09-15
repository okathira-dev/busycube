const locale =
  new URL(location.href).searchParams.get("locale") === "ja" ? "ja" : "en";
const copy = {
  en: {
    title: "Busycube — Third-party licenses",
    back: "← Busycube",
    heading: "Third-party licenses",
    intro: "Busycube includes the following third-party software and font assets.",
    licenseText: "License text",
    sourceCode: "Source code",
    correspondingSource: "Corresponding source code",
    copyrightLicense: "Copyright notice and license text",
    upstreamSource: "Upstream source",
  },
  ja: {
    title: "Busycube — 第三者ライセンス",
    back: "← Busycube",
    heading: "第三者ライセンス",
    intro: "Busycubeに含まれる第三者ソフトウェアとフォントのライセンスです。",
    licenseText: "ライセンス本文",
    sourceCode: "ソースコード",
    correspondingSource: "対応するソースコード",
    copyrightLicense: "著作権表示とライセンス本文",
    upstreamSource: "上流プロジェクト",
  },
}[locale];
document.documentElement.lang = locale;
for (const element of document.querySelectorAll("[data-i18n]")) {
  const key = element.getAttribute("data-i18n");
  if (key && key in copy) element.textContent = copy[key];
}
