import Button from "@mui/material/Button";
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  mergeProgressDocuments,
  type ProgressDocument,
} from "./domain/progress";
import { countSolvedBoxes } from "./domain/stageRuntime";
import { useDriveBackup } from "./hooks/useDriveBackup";
import { useProgress } from "./hooks/useProgress";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { detectLocale, type Locale, messages, productCopy } from "./i18n";
import { ManifestStageHost } from "./runtime/ManifestStageHost";
import { stageIndex } from "./runtime/stage-index";
import {
  type AppRoute,
  appUrlForStage,
  appUrlForView,
  type MainView,
  readAppRoute,
} from "./ui/appRoute";
import { LanguageSelect } from "./ui/LanguageSelect";
import { uiText } from "./ui/locale";
import { MainTabs } from "./ui/MainTabs";
import { ProgressStorageAlert } from "./ui/ProgressStorageAlert";
import { pageMetadata } from "./ui/pageMetadata";
import {
  type ProgressImportResult,
  prepareProgressImport,
} from "./ui/progressImport";
import { StageCatalogue } from "./ui/StageCatalogue";
import {
  buildCatalogueStages,
  findNextIncompleteStage,
} from "./ui/stageCatalogueModel";
import { ViewLoadBoundary } from "./ui/ViewLoadBoundary";

type StageId = (typeof stageIndex)[number]["id"];
const SettingsView = lazy(() =>
  import("./ui/SettingsView").then((module) => ({
    default: module.SettingsView,
  })),
);
const AboutView = lazy(() =>
  import("./ui/AboutView").then((module) => ({ default: module.AboutView })),
);
const totalBoxCount = stageIndex.reduce(
  (total, stage) => total + stage.boxIds.length,
  0,
);
const catalogueStages = buildCatalogueStages(stageIndex);

const headingIds = {
  stages: "busycube-stages-heading",
  settings: "busycube-settings-heading",
  about: "busycube-about-heading",
} as const;

function isStageId(value: string): value is StageId {
  return stageIndex.some((stage) => stage.id === value);
}

function currentRoute(): AppRoute<StageId> {
  return readAppRoute(window.location.href, isStageId);
}

function initialLocale() {
  const locale = new URL(window.location.href).searchParams.get("locale");
  return locale === "ja" || locale === "en" ? locale : detectLocale();
}

export function App() {
  const progress = useProgress(initialLocale());
  const serviceWorker = useServiceWorker();
  const drive = useDriveBackup(progress);
  const locale = progress.document.settings.locale;
  const [route, setRoute] = useState(currentRoute);
  const [catalogueRestore, setCatalogueRestore] = useState<{
    stageId: StageId;
    scrollY?: number;
  } | null>(null);
  const catalogueReturnRef = useRef<{
    stageId: StageId;
    scrollY?: number;
  } | null>(null);
  // 同じステージへ履歴移動した場合も実行中の資源と一時状態を作り直すため、
  // URL上のIDとは別に訪問単位のキーを持つ。
  const [stageAttemptId, setStageAttemptId] = useState(0);
  const view = route.view;
  const selectedStageId = route.stageId;
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

  const inspectProgressImport = async (
    file: File,
  ): Promise<ProgressImportResult> =>
    prepareProgressImport(file, progress.document);

  const mergeImportedProgress = (imported: ProgressDocument) => {
    progress.replaceDocument((current) =>
      mergeProgressDocuments(current, imported),
    );
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
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    // 戻る・進むではReact側の操作関数を通らないため、URLを正として画面を同期する。
    const syncRoute = (event: PopStateEvent) => {
      const nextRoute = currentRoute();
      const historyRestore = event.state?.busycube?.catalogueReturn as
        | { stageId: StageId; scrollY?: number }
        | undefined;
      if (historyRestore && isStageId(historyRestore.stageId)) {
        catalogueReturnRef.current = historyRestore;
      }
      if (!nextRoute.stageId && catalogueReturnRef.current) {
        setCatalogueRestore({ ...catalogueReturnRef.current });
      }
      setRoute(nextRoute);
      if (nextRoute.stageId) {
        setStageAttemptId((current) => current + 1);
      }
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  // pushState自身はpopstateを発火しないため、共有可能なURLとReactの状態を同時に更新する。
  const openStage = useCallback((stageId: StageId, fromCatalogue = false) => {
    const restore = {
      stageId,
      ...(fromCatalogue ? { scrollY: window.scrollY } : {}),
    };
    catalogueReturnRef.current = restore;
    window.history.pushState(
      { busycube: { catalogueReturn: restore } },
      "",
      appUrlForStage(window.location.href, stageId),
    );
    setRoute({ view: "stages", stageId });
    setStageAttemptId((current) => current + 1);
  }, []);

  const openCatalogueStage = useCallback(
    (stageId: string) => openStage(stageId as StageId, true),
    [openStage],
  );

  const showStageList = () => {
    const restore =
      catalogueReturnRef.current ??
      (selectedStageId ? { stageId: selectedStageId } : null);
    if (restore) setCatalogueRestore({ ...restore });
    window.history.pushState(
      {},
      "",
      appUrlForView(window.location.href, "stages"),
    );
    setRoute({ view: "stages", stageId: null });
  };

  const showMainView = (nextView: MainView) => {
    window.history.pushState(
      {},
      "",
      appUrlForView(window.location.href, nextView),
    );
    setRoute({ view: nextView, stageId: null });
    window.scrollTo({ top: 0 });
  };

  const changeLocale = (nextLocale: Locale) => {
    // 選択言語を保存データだけでなく共有URLにも反映し、再読込や法務ページとの
    // 往復で一時的に別言語が選ばれる状態を避ける。
    const url = new URL(window.location.href);
    url.searchParams.set("locale", nextLocale);
    window.history.replaceState(window.history.state, "", url.href);
    progress.setLocale(nextLocale);
  };

  const selectedCatalogueStage = selectedStageId
    ? catalogueStages.find((stage) => stage.manifest.id === selectedStageId)
    : undefined;
  const selectedManifest = selectedCatalogueStage?.manifest;

  useEffect(() => {
    const metadata = pageMetadata({
      locale,
      view,
      stageName: selectedManifest?.name[locale],
      displayCode: selectedCatalogueStage?.displayCode,
    });
    document.title = metadata.title;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute("content", metadata.description);
  }, [locale, selectedCatalogueStage?.displayCode, selectedManifest, view]);

  // ステージを没入型の画面として扱う。利用者が一覧で認識するaccess group順を
  // 前後関係の正本にし、プレイ領域では通常のヒーローとタブを表示しない。
  const selectedStageIndex = selectedCatalogueStage
    ? catalogueStages.indexOf(selectedCatalogueStage)
    : -1;
  const previousCatalogueStage = catalogueStages[selectedStageIndex - 1];
  const nextCatalogueStage = catalogueStages[selectedStageIndex + 1];
  const isStageView = view === "stages" && Boolean(selectedManifest);
  const nextIncompleteStage = useMemo(
    () => findNextIncompleteStage(catalogueStages, progress.document.stages),
    [progress.document.stages],
  );

  return (
    <div className={`app-shell ${isStageView ? "app-shell--stage" : ""}`}>
      {!isStageView && (
        <>
          {/* 言語が増えても同じ導線を保てるよう、3つのメイン画面に共通の選択欄を置く。 */}
          <div className="shell-toolbar">
            {view !== "stages" && (
              <Button
                className="shell-brand"
                color="inherit"
                onClick={() => showMainView("stages")}
              >
                {productCopy.brandName}
              </Button>
            )}
            <LanguageSelect
              locale={locale}
              label={copy.language}
              onChange={changeLocale}
            />
          </div>
          {view === "stages" && (
            <header className="hero">
              <span className="eyebrow">{productCopy.descriptor}</span>
              <h1>{productCopy.brandName}</h1>
              <p className="hero__tagline">{copy.tagline}</p>
              <p className="hero__subtitle">{copy.subtitle}</p>
            </header>
          )}

          <MainTabs
            value={view}
            labels={{
              stages: copy.stages,
              settings: copy.settings,
              about: copy.aboutTab,
            }}
            hrefs={{
              stages: appUrlForView(window.location.href, "stages"),
              settings: appUrlForView(window.location.href, "settings"),
              about: appUrlForView(window.location.href, "about"),
            }}
            ariaLabel={uiText(locale, "primaryNav")}
            onChange={showMainView}
          />
        </>
      )}

      <ProgressStorageAlert
        locale={locale}
        state={progress.storageState}
        message={storageMessage}
        onRetry={progress.retryStorage}
        onOpenSettings={() => showMainView("settings")}
      />

      <main className="content">
        <ViewLoadBoundary
          key={`${view}:${selectedStageId ?? ""}`}
          locale={locale}
        >
          {view === "stages" &&
          selectedManifest &&
          progress.storageState !== "loading" ? (
            <ManifestStageHost
              key={`${selectedManifest.id}:${stageAttemptId}`}
              manifest={selectedManifest}
              displayCode={selectedCatalogueStage?.displayCode ?? ""}
              locale={locale}
              progress={progress}
              services={{
                drive: { configured: drive.configured, sync: drive.sync },
              }}
              onBack={showStageList}
              previousStage={previousCatalogueStage?.manifest}
              previousDisplayCode={previousCatalogueStage?.displayCode}
              onPrevious={
                previousCatalogueStage
                  ? () =>
                      openStage(previousCatalogueStage.manifest.id as StageId)
                  : undefined
              }
              nextStage={nextCatalogueStage?.manifest}
              nextDisplayCode={nextCatalogueStage?.displayCode}
              onNext={
                nextCatalogueStage
                  ? () => openStage(nextCatalogueStage.manifest.id as StageId)
                  : undefined
              }
            />
          ) : view === "stages" ? (
            <StageCatalogue
              headingId={headingIds.stages}
              heading={copy.stages}
              progressLabel={copy.progress}
              solvedCount={solvedCount}
              totalBoxCount={totalBoxCount}
              locale={locale}
              stages={catalogueStages}
              progressStages={progress.document.stages}
              nextIncompleteStage={nextIncompleteStage}
              restore={catalogueRestore}
              onOpen={openCatalogueStage}
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
              onExport={exportProgress}
              onPrepareImport={inspectProgressImport}
              onMergeImport={mergeImportedProgress}
              onReset={progress.reset}
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
        </ViewLoadBoundary>
      </main>
    </div>
  );
}
