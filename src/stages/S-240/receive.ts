import { stageText } from "../locale";
import { locale } from "./locale";
import { receiveSharedMarks } from "./shareReceipt";

const controller = new AbortController();
window.addEventListener("pagehide", () => controller.abort(), { once: true });
const content =
  document.querySelector<HTMLMetaElement>('meta[name="busycube-shared-marks"]')
    ?.content ?? "";
const status = document.getElementById("status");
const language = navigator.language.startsWith("ja") ? "ja" : "en";
if (status) status.textContent = stageText(language, locale.receiving);
async function receive() {
  try {
    const receivedLocale = await receiveSharedMarks(
      content.split(","),
      controller.signal,
    );
    if (controller.signal.aborted) return;
    if (receivedLocale)
      location.replace(`/?locale=${receivedLocale}&stage=S-240`);
    else if (status) status.textContent = stageText(language, locale.noMatch);
  } catch {
    if (!controller.signal.aborted && status)
      status.textContent = stageText(language, locale.receiveFailed);
  }
}
void receive();
