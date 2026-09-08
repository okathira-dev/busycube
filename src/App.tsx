import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useState } from "react";
import { countSolvedBoxes } from "./domain/stageRuntime";
import { useDriveBackup } from "./hooks/useDriveBackup";
import { useProgress } from "./hooks/useProgress";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { detectLocale, messages, productCopy } from "./i18n";
import { ManifestStageHost } from "./runtime/ManifestStageHost";
import { stageIndex } from "./runtime/stage-index.generated";
import { uiText } from "./ui/locale";
import { StageCatalogue } from "./ui/StageCatalogue";

type View = "stages" | "settings" | "about";
type StageId = (typeof stageIndex)[number]["id"];
const totalBoxCount = stageIndex.reduce(
  (total, stage) => total + stage.boxIds.length,
  0,
);

const headingIds = {
  stages: "busycube-stages-heading",
  settings: "busycube-settings-heading",
  about: "busycube-about-heading",
} as const;

function isStageId(value: string): value is StageId {
  return stageIndex.some((stage) => stage.id === value);
}

function stageIdFromUrl(): StageId | null {
  const stageId = new URL(window.location.href).searchParams.get("stage");
  return stageId && isStageId(stageId) ? stageId : null;
}

export function App() {
  const progress = useProgress(detectLocale());
  const serviceWorker = useServiceWorker();
  const drive = useDriveBackup(progress);
  const locale = progress.document.settings.locale;
  const [view, setView] = useState<View>("stages");
  const [selectedStageId, setSelectedStageId] = useState(stageIdFromUrl);
  // 同じステージへ履歴移動した場合も実行中の資源と一時状態を作り直すため、
  // URL上のIDとは別に訪問単位のキーを持つ。
  const [stageAttemptId, setStageAttemptId] = useState(0);
  const copy = messages[locale];
  const solvedCount = stageIndex.reduce((total, stage) => {
    const solvedBoxIds = new Set(
      progress.document.stages[stage.id]?.solvedBoxIds ?? [],
    );
    return total + countSolvedBoxes(stage.boxIds, solvedBoxIds);
  }, 0);
  const storageMessage = {
    loading: copy.storageLoading,
    ready: copy.storageReady,
    unavailable: copy.storageUnavailable,
    corrupt: copy.storageCorrupt,
    future: copy.storageFuture,
  }[progress.storageState];
  const serviceWorkerMessage = {
    unsupported: copy.pwaUnsupported,
    development: copy.pwaDevelopment,
    registering: copy.pwaRegistering,
    ready: copy.pwaReady,
    "update-ready": copy.pwaUpdate,
    error: copy.pwaError,
  }[serviceWorker.state];
  const driveStatusMessage = {
    unconfigured: copy.driveUnconfigured,
    idle: copy.driveIdle,
    authorizing: copy.driveAuthorizing,
    syncing: copy.driveSyncing,
    success: copy.driveSuccess,
    deleted: copy.driveDeleted,
    error: copy.driveError,
  }[drive.state];

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(progress.document, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `busycube-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetProgress = () => {
    if (window.confirm(copy.resetConfirm)) void progress.reset();
  };
  const driveFailureMessage =
    drive.failure?.code === "corrupt"
      ? copy.driveFailureCorrupt
      : drive.failure?.code === "future"
        ? copy.driveFailureFuture
        : drive.failure?.code === "conflict"
          ? copy.driveFailureConflict
          : copy.driveFailureUnknown;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    // 戻る・進むではReact側の操作関数を通らないため、URLを正として画面を同期する。
    const syncRoute = () => {
      setSelectedStageId(stageIdFromUrl());
      setStageAttemptId((current) => current + 1);
      setView("stages");
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  // pushState自身はpopstateを発火しないため、共有可能なURLとReactの状態を同時に更新する。
  const openStage = (stageId: StageId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("stage", stageId);
    window.history.pushState({}, "", url);
    setSelectedStageId(stageId);
    setStageAttemptId((current) => current + 1);
  };

  const showStageList = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("stage");
    window.history.pushState({}, "", url);
    setSelectedStageId(null);
  };

  const selectedManifest = selectedStageId
    ? stageIndex.find((stage) => stage.id === selectedStageId)
    : undefined;
  // ステージを没入型の画面として扱う。生成済み索引の並びを前後関係の正本にし、
  // プレイ領域では通常のヒーローとタブを表示しない。
  const selectedStageIndex = selectedManifest
    ? stageIndex.indexOf(selectedManifest)
    : -1;
  const previousManifest = stageIndex[selectedStageIndex - 1];
  const nextManifest = stageIndex[selectedStageIndex + 1];
  const isStageView = view === "stages" && Boolean(selectedManifest);

  return (
    <div className={`app-shell ${isStageView ? "app-shell--stage" : ""}`}>
      {!isStageView && (
        <>
          {/* 言語が増えても同じ導線を保てるよう、3つのメイン画面に共通の選択欄を置く。 */}
          <div className="shell-toolbar">
            <Select
              className="language-picker"
              value={locale}
              onChange={(event: SelectChangeEvent) =>
                progress.setLocale(event.target.value as "ja" | "en")
              }
              inputProps={{ "aria-label": copy.language }}
              MenuProps={{ classes: { paper: "language-picker-menu" } }}
              renderValue={(value) => (
                <span className="language-picker__value">
                  <LanguageOutlined aria-hidden="true" />
                  <span>{copy.language}</span>
                  <strong>
                    {value === "ja" ? copy.japanese : copy.english}
                  </strong>
                </span>
              )}
            >
              <MenuItem value="ja">日本語</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </div>
          <header className="hero">
            <a className="eyebrow" href="/">
              {productCopy.descriptor}
            </a>
            <h1>{productCopy.brandName}</h1>
            <p className="hero__tagline">{copy.tagline}</p>
            <p className="hero__subtitle">{copy.subtitle}</p>
          </header>

          <nav className="nav" aria-label={uiText(locale, "primaryNav")}>
            <button
              type="button"
              aria-current={view === "stages" ? "page" : undefined}
              onClick={() => setView("stages")}
            >
              {copy.stages}
            </button>
            <button
              type="button"
              aria-current={view === "settings" ? "page" : undefined}
              onClick={() => setView("settings")}
            >
              {copy.settings}
            </button>
            <button
              type="button"
              aria-current={view === "about" ? "page" : undefined}
              onClick={() => setView("about")}
            >
              {copy.about}
            </button>
          </nav>
        </>
      )}

      <main className="content">
        {view === "stages" &&
        selectedManifest &&
        progress.storageState !== "loading" ? (
          <ManifestStageHost
            key={`${selectedManifest.id}:${stageAttemptId}`}
            manifest={selectedManifest}
            locale={locale}
            progress={progress}
            services={{
              drive: { configured: drive.configured, sync: drive.sync },
            }}
            onBack={showStageList}
            previousStage={previousManifest}
            onPrevious={
              previousManifest
                ? () => openStage(previousManifest.id)
                : undefined
            }
            nextStage={nextManifest}
            onNext={nextManifest ? () => openStage(nextManifest.id) : undefined}
          />
        ) : view === "stages" ? (
          <StageCatalogue
            headingId={headingIds.stages}
            heading={copy.stages}
            progressLabel={copy.progress}
            solvedCount={solvedCount}
            totalBoxCount={totalBoxCount}
            locale={locale}
            stages={stageIndex}
            progressStages={progress.document.stages}
            onOpen={openStage}
          />
        ) : null}

        {view === "settings" && (
          <section className="panel" aria-labelledby={headingIds.settings}>
            <h2 id={headingIds.settings}>{copy.settings}</h2>
            <fieldset>
              <legend>{copy.language}</legend>
              <label>
                <input
                  type="radio"
                  name="locale"
                  checked={locale === "ja"}
                  onChange={() => progress.setLocale("ja")}
                />{" "}
                {copy.japanese}
              </label>
              <label>
                <input
                  type="radio"
                  name="locale"
                  checked={locale === "en"}
                  onChange={() => progress.setLocale("en")}
                />{" "}
                {copy.english}
              </label>
            </fieldset>
            <div
              className={`storage-status storage-status--${progress.storageState}`}
              role="status"
            >
              {storageMessage}
            </div>
            <div className="settings-actions">
              <button type="button" onClick={exportProgress}>
                <FileDownloadOutlined aria-hidden="true" />
                {copy.exportProgress}
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={resetProgress}
              >
                <RestartAltOutlined aria-hidden="true" />
                {copy.resetProgress}
              </button>
            </div>
            {/* 状態の説明をdisabledボタンで代用せず、実行できる操作だけをボタンにする。 */}
            <h3>{copy.pwa}</h3>
            <p className="settings-status" role="status" aria-live="polite">
              {serviceWorkerMessage}
            </p>
            {serviceWorker.state === "update-ready" && (
              <button
                type="button"
                className="pwa-action"
                onClick={serviceWorker.applyUpdate}
              >
                <InstallDesktopOutlined aria-hidden="true" />
                {copy.pwaApplyUpdate}
              </button>
            )}
            <h3>{copy.drive}</h3>
            <p className="settings-status" role="status" aria-live="polite">
              {driveStatusMessage}
            </p>
            {drive.configured && (
              <button
                type="button"
                className="drive-action"
                disabled={
                  drive.state === "authorizing" || drive.state === "syncing"
                }
                onClick={() => void drive.sync()}
              >
                <CloudSyncOutlined aria-hidden="true" />
                {copy.driveSync}
              </button>
            )}
            <p className="privacy-note">{copy.driveMergeNotice}</p>
            {drive.failure && (
              <div className="drive-recovery" role="alert">
                <p>{driveFailureMessage}</p>
                <div className="drive-secondary-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void drive.sync()}
                  >
                    {copy.driveRetry}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={drive.dismissFailure}
                  >
                    {copy.driveContinueLocal}
                  </button>
                </div>
                {drive.failure.replicas.map((replica) => (
                  <div className="drive-recovery__replica" key={replica.id}>
                    <code>{replica.name}</code>
                    <div className="drive-secondary-actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => void drive.exportFailedReplica(replica)}
                      >
                        {copy.driveExportReplica}
                      </button>
                      <button
                        type="button"
                        className="text-button danger-text"
                        onClick={() => {
                          if (window.confirm(copy.driveRemoveReplicaConfirm)) {
                            void drive.removeFailedReplica(replica);
                          }
                        }}
                      >
                        {copy.driveRemoveReplica}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {drive.connected && (
              <div className="drive-secondary-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void drive.disconnect()}
                >
                  {copy.driveDisconnect}
                </button>
                <button
                  type="button"
                  className="text-button danger-text"
                  onClick={() => {
                    if (window.confirm(copy.driveDeleteConfirm)) {
                      void drive.removeRemote();
                    }
                  }}
                >
                  {copy.driveDelete}
                </button>
              </div>
            )}
            <p className="privacy-note">{copy.privacy}</p>
            <div className="about-links">
              <a href={`./privacy/index.html?locale=${locale}`}>
                {copy.privacyPolicy}
              </a>
              <a href={`./terms/index.html?locale=${locale}`}>
                {copy.termsOfService}
              </a>
            </div>
          </section>
        )}

        {view === "about" && (
          <section className="panel" aria-labelledby={headingIds.about}>
            <h2 id={headingIds.about}>{copy.about}</h2>
            <p>{copy.aboutBody}</p>
            <div className="about-links">
              <a href={`./privacy/index.html?locale=${locale}`}>
                {copy.privacyPolicy}
              </a>
              <a href={`./terms/index.html?locale=${locale}`}>
                {copy.termsOfService}
              </a>
              <a href={`./licenses/index.html?locale=${locale}`}>
                {copy.thirdPartyLicenses}
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
