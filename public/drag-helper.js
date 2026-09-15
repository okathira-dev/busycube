const params = new URL(location.href).searchParams;
const locale = params.get("locale") === "ja" ? "ja" : "en";
const mode = params.get("mode") === "window" ? "window" : "iframe";
const round = params.get("round") || "";
document.documentElement.lang = locale;
const copy = {
  ja: {
    title: mode === "window" ? "Busycube別windowの画像" : "Busycube iframeの画像",
    heading: mode === "window" ? "別windowの画像" : "iframe内の画像",
    description: "この画像をBusycubeのドロップ欄へドラッグしてください。",
    alt: mode === "window" ? "別windowの画像" : "iframe内の画像",
  },
  en: {
    title:
      mode === "window"
        ? "Busycube separate-window image"
        : "Busycube iframe image",
    heading: mode === "window" ? "Separate-window image" : "Image inside iframe",
    description: "Drag this image to the Busycube drop zone.",
    alt: mode === "window" ? "Separate-window image" : "Image inside iframe",
  },
}[locale];
document.title = copy.title;
document.querySelector("#heading").textContent = copy.heading;
document.querySelector("#description").textContent = copy.description;
const image = document.querySelector("#source");
image.alt = copy.alt;
const receiver = mode === "window" ? window.opener : window.parent;
image.addEventListener("dragstart", (event) => {
  receiver?.postMessage(
    {
      channel: "busycube-s510-drag",
      type: "start",
      round,
      asset: "window",
    },
    location.origin,
  );
  event.dataTransfer.setData(
    "text/uri-list",
    new URL(image.src, location.href).href,
  );
  event.dataTransfer.setData("text/plain", `busycube-round:${round}:window`);
  event.dataTransfer.effectAllowed = "copy";
});
