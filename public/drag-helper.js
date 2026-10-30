const japanese = new URL(location.href).searchParams.get("locale") === "ja";
document.documentElement.lang = japanese ? "ja" : "en";
const image = document.querySelector("#source");
if (image) image.alt = "iframe";
// Restrict the image menu, while leaving the browser's drag payload untouched.
document.addEventListener("contextmenu", (event) => event.preventDefault());
