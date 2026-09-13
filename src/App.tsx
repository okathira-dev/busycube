import { useEffect, useState } from "react";
import { countSolvedBoxes } from "./domain/stageRuntime";
import { useDriveBackup } from "./hooks/useDriveBackup";
import { useProgress } from "./hooks/useProgress";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { detectLocale, messages, productCopy } from "./i18n";
import { ManifestStageHost } from "./runtime/ManifestStageHost";
import { stageIndex } from "./runtime/stage-index.generated";
import { AboutView } from "./ui/AboutView";
import { LanguageSelect } from "./ui/LanguageSelect";
import { uiText } from "./ui/locale";
import { MainTabs, type MainView } from "./ui/MainTabs";
import { SettingsView } from "./ui/SettingsView";
import { StageCatalogue } from "./ui/StageCatalogue";

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
  const [view, setView] = useState<MainView>("stages");
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
            <LanguageSelect
              locale={locale}
              label={copy.language}
              onChange={progress.setLocale}
            />
          </div>
          <header className="hero">
            <a className="eyebrow" href="/">
              {productCopy.descriptor}
            </a>
            <h1>{productCopy.brandName}</h1>
            <p className="hero__tagline">{copy.tagline}</p>
            <p className="hero__subtitle">{copy.subtitle}</p>
          </header>

          <MainTabs
            value={view}
            labels={{
              stages: copy.stages,
              settings: copy.settings,
              about: copy.about,
            }}
            ariaLabel={uiText(locale, "primaryNav")}
            onChange={setView}
          />
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
          <SettingsView
            headingId={headingIds.settings}
            locale={locale}
            storageState={progress.storageState}
            storageMessage={storageMessage}
            serviceWorkerState={serviceWorker.state}
            serviceWorkerMessage={serviceWorkerMessage}
            driveState={drive.state}
            driveStatusMessage={driveStatusMessage}
            driveConfigured={drive.configured}
            driveConnected={drive.connected}
            driveFailure={drive.failure}
            driveFailureMessage={driveFailureMessage}
            onLocaleChange={progress.setLocale}
            onExport={exportProgress}
            onReset={() => void progress.reset()}
            onApplyUpdate={serviceWorker.applyUpdate}
            onDriveSync={() => void drive.sync()}
            onDriveDisconnect={() => void drive.disconnect()}
            onDriveDelete={() => void drive.removeRemote()}
            onDriveRetry={() => void drive.sync()}
            onDriveDismissFailure={drive.dismissFailure}
            onDriveExportReplica={(replica) =>
              void drive.exportFailedReplica(replica)
            }
            onDriveRemoveReplica={(replica) =>
              void drive.removeFailedReplica(replica)
            }
          />
        )}

        {view === "about" && (
          <AboutView headingId={headingIds.about} locale={locale} />
        )}
      </main>
    </div>
  );
}
