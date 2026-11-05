import fixtures from "../../fixtures/drag-contract.json";
import { evaluateImageDrop } from "../../fixtures/nativeImageDrop";
import type { PocRoot } from "../contracts";

export function evaluateNativeImageDrop(
  uriList: string,
  fileDigest: string | undefined,
  pageUrl: string,
) {
  return evaluateImageDrop(
    uriList,
    fileDigest,
    new URL("../", pageUrl).href,
    fixtures,
  );
}

export function mount(root: PocRoot): () => void {
  const status = root.querySelector<HTMLOutputElement>("[data-poc-status]");
  const target = root.querySelector<HTMLElement>("[data-dnd-target]");
  const sourceFrame =
    root.querySelector<HTMLIFrameElement>("[data-dnd-source]");
  const openWindow = root.querySelector<HTMLButtonElement>(
    "[data-dnd-open-window]",
  );
  const reset = root.querySelector<HTMLButtonElement>("[data-dnd-reset]");
  const log = root.querySelector<HTMLTextAreaElement>("[data-dnd-log]");
  const copy = root.querySelector<HTMLButtonElement>("[data-dnd-copy]");
  const copyStatus = root.querySelector<HTMLOutputElement>(
    "[data-dnd-copy-status]",
  );
  const experiment = root.querySelector<HTMLSelectElement>("[data-dnd-case]");
  const preview = root.querySelector<HTMLOutputElement>("[data-dnd-preview]");
  if (!status || !target || !log || !experiment) return () => undefined;
  const entries: object[] = [];
  const controller = new AbortController();
  let startedAt = performance.now();
  let environment = {};
  let generation = 0;
  let lastHover = "";
  const append = (entry: object) => {
    entries.push({
      elapsedMs: Math.round(performance.now() - startedAt),
      ...entry,
    });
    if (entries.length > 24) entries.shift();
    log.value = JSON.stringify(
      { schema: "busycube-s510-native-dnd-v2", environment, records: entries },
      null,
      2,
    );
  };

  const setStatus = (message: string) => {
    status.value = message;
  };
  const showChecks = (
    uri: string,
    digest: string | undefined,
    trial: string,
  ) => {
    const checks = evaluateNativeImageDrop(uri, digest, location.href);
    append({ event: "candidate-gate", experiment: trial, checks });
    const names: Record<string, string> = {
      page: "左",
      file: "中",
      window: "右",
    };
    if (preview)
      preview.value = checks
        .map(
          (check) =>
            `${names[check.image]}: ${check.accepted ? "受付OK" : "受付NG"}（対象Web URL ${check.hasExpectedWebUrl ? "あり" : "なし"}／実File内容一致 ${check.fileContentMatches ? "あり" : "なし"}）`,
        )
        .join("\n");
    return checks.some((check) => check.accepted);
  };
  const onDragOver = (event: DragEvent) => {
    if (!event.isTrusted) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    target.dataset.dragover = "true";
    const record = {
      experiment: experiment.value,
      event: event.type,
      isTrusted: event.isTrusted,
      types: [...(event.dataTransfer?.types ?? [])],
    };
    const signature = JSON.stringify(record);
    if (signature !== lastHover) append(record);
    lastHover = signature;
  };
  const onDragLeave = () => {
    delete target.dataset.dragover;
  };
  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    delete target.dataset.dragover;
    const transfer = event.dataTransfer;
    if (!event.isTrusted || !transfer) {
      setStatus("実dropではありません。ブラウザ挙動の検証結果には含めません。");
      return;
    }
    const trialGeneration = generation;
    lastHover = "";
    const types = [...transfer.types];
    const uri = transfer.getData("text/uri-list");
    const files = [...transfer.files];
    const trial = experiment.value;
    if (preview) preview.value = "実Fileを照合中…";
    // Read the drag store before yielding; payload access is protected later.
    append({
      experiment: trial,
      event: event.type,
      isTrusted: event.isTrusted,
      types,
      uri,
      text: transfer.getData("text/plain"),
      fileCount: files.length,
      files: files.map(({ name, type, size }) => ({ name, type, size })),
      effectAllowed: transfer.effectAllowed,
      dropEffect: transfer.dropEffect,
      items: [...transfer.items].map((item) => {
        const metadata = { kind: item.kind, type: item.type };
        if (item.kind !== "file") return metadata;
        try {
          const file = item.getAsFile();
          return {
            ...metadata,
            file: file
              ? { name: file.name, type: file.type, size: file.size }
              : null,
          };
        } catch (error) {
          return { ...metadata, fileAccessError: String(error) };
        }
      }),
    });
    if (files.length > 0) {
      if ((files[0]?.size ?? 0) > 1_048_576) {
        showChecks(uri, undefined, trial);
        setStatus("1MiB超のファイルは読みません。");
        return;
      }
      try {
        const bytes = await files[0]?.arrayBuffer();
        const digest = bytes
          ? await crypto.subtle.digest("SHA-256", bytes)
          : undefined;
        const checksum = digest
          ? [...new Uint8Array(digest)]
              .map((value) => value.toString(16).padStart(2, "0"))
              .join("")
          : "none";
        if (generation !== trialGeneration || controller.signal.aborted) return;
        append({
          experiment: trial,
          route: "File",
          sha256: checksum,
          matchingFixtures: Object.entries(fixtures)
            .filter(([, fixture]) => fixture.sha256 === checksum)
            .map(([name]) => name),
        });
        const accepted = showChecks(uri, checksum, trial);
        setStatus(
          accepted
            ? "受付OK：対象画像のWeb URLと実Fileの内容が一致しました。"
            : "受付NG：実Fileは届きましたが、対象Web URLと内容一致の両方はそろっていません。",
        );
        root.dataset.pocState = "partial";
      } catch (error) {
        if (generation !== trialGeneration || controller.signal.aborted) return;
        append({ experiment: trial, route: "File", error: String(error) });
        showChecks(uri, undefined, trial);
        setStatus("Fileの読み取り・照合に失敗しました。ログもコピーできます。");
      }
      return;
    }
    showChecks(uri, undefined, trial);
    if (uri) {
      const first = uri
        .split(/\r?\n/)
        .find((line) => line && !line.startsWith("#"));
      try {
        const url = new URL(first ?? "", location.href);
        const known = Object.values(fixtures).some(
          ({ filename }) =>
            url.href === new URL(`../${filename}`, location.href).href,
        );
        if (known) {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const digest = await crypto.subtle.digest(
            "SHA-256",
            await response.arrayBuffer(),
          );
          if (generation !== trialGeneration || controller.signal.aborted)
            return;
          const sha256 = [...new Uint8Array(digest)]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("");
          append({
            experiment: trial,
            route: "URI",
            sha256,
            matchingFixtures: Object.entries(fixtures)
              .filter(([, fixture]) => fixture.sha256 === sha256)
              .map(([name]) => name),
          });
        } else
          append({
            experiment: trial,
            skipped: "検証画像以外のURLは取得しません",
          });
      } catch (error) {
        if (generation !== trialGeneration || controller.signal.aborted) return;
        append({ experiment: trial, route: "URI", error: String(error) });
        setStatus(
          `URI照合失敗: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
      setStatus(
        "受付NG：URLは届きましたが実Fileがありません。URLのfetchによる照合だけでは受け付けません。",
      );
      root.dataset.pocState = "partial";
      return;
    }
    setStatus(
      `DataTransferは届いたが対象payloadなし: types=${types.join(", ")}`,
    );
  };
  let sourceWindow: Window | null = null;
  const openSeparateWindow = () => {
    experiment.value = "external-window-iframe";
    append({ event: "open-window", experiment: experiment.value });
    const helperUrl = new URL("../poc-dnd-window.html", location.href);
    sourceWindow = window.open(
      helperUrl.href,
      "busycube-dnd-source",
      "popup,width=420,height=360",
    );
    if (sourceWindow) {
      sourceWindow.focus();
      setStatus(
        "別窓のiframeから実dragしてください。親ページと同じsandbox・画像・制限です。",
      );
    } else {
      setStatus("別windowを開けませんでした。popup許可を確認してください。");
    }
  };
  const clear = () => {
    generation += 1;
    lastHover = "";
    entries.length = 0;
    startedAt = performance.now();
    environment = {
      startedAt: new Date().toISOString(),
      browser: navigator.userAgent,
      origin: location.origin,
      secureContext: isSecureContext,
      iframeSandbox: sourceFrame?.getAttribute("sandbox"),
      iframeSource: sourceFrame?.getAttribute("src"),
      recordedLocallyOnly: true,
    };
    append({ event: "ready", experiment: experiment.value });
    if (preview)
      preview.value = "判定待ち。対象Web URL＋実Fileの内容一致が必要です。";
    if (copyStatus) copyStatus.value = "";
    delete target.dataset.dragover;
    delete root.dataset.pocState;
    setStatus("未実行。実dragのみを記録します。");
  };
  const copyLog = async () => {
    const copyGeneration = generation;
    try {
      await navigator.clipboard.writeText(log.value);
      if (
        !controller.signal.aborted &&
        generation === copyGeneration &&
        copyStatus
      )
        copyStatus.value =
          "ログをコピーしました。そのままチャットへ貼り付けてください。";
    } catch {
      if (controller.signal.aborted || generation !== copyGeneration) return;
      log.focus();
      log.select();
      if (copyStatus)
        copyStatus.value = "ログを選択しました。Ctrl+Cでコピーしてください。";
    }
  };
  const onCopy = () => {
    void copyLog();
  };
  const onExperimentChange = () => {
    lastHover = "";
    append({ event: "experiment-change", experiment: experiment.value });
  };
  target.addEventListener("dragover", onDragOver);
  target.addEventListener("dragleave", onDragLeave);
  target.addEventListener("drop", onDrop);
  experiment.addEventListener("change", onExperimentChange);
  copy?.addEventListener("click", onCopy);
  openWindow?.addEventListener("click", openSeparateWindow);
  reset?.addEventListener("click", clear);
  clear();

  return () => {
    controller.abort();
    generation += 1;
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("dragleave", onDragLeave);
    target.removeEventListener("drop", onDrop);
    experiment.removeEventListener("change", onExperimentChange);
    copy?.removeEventListener("click", onCopy);
    openWindow?.removeEventListener("click", openSeparateWindow);
    reset?.removeEventListener("click", clear);
    sourceWindow?.close();
  };
}
