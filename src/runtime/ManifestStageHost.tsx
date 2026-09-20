import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deriveProblemBoxVisualState,
  safeCapabilityProbe,
} from "../domain/stageRuntime";
import type { ProgressController } from "../hooks/useProgress";
import { type Locale, messages } from "../i18n";
import { uiText } from "../ui/locale";
import type {
  StageManifest,
  StageModule,
  StageServices,
} from "./stageContract";
import "./ManifestStageHost.css";

interface Props {
  manifest: StageManifest;
  displayCode: string;
  previousStage?: StageManifest;
  previousDisplayCode?: string;
  nextStage?: StageManifest;
  nextDisplayCode?: string;
  locale: Locale;
  progress: ProgressController;
  services: StageServices;
  onBack(): void;
  onPrevious?(): void;
  onNext?(): void;
}

interface BoundaryProps {
  stageId: string;
  locale: Locale;
  children: ReactNode;
}

const activeStageHeadingId = "busycube-active-stage-heading";
// 通常の再描画や再訪では同じ遅延ロード結果を共有し、明示的な再試行時だけ破棄する。
const modulePromises = new WeakMap<StageManifest, Promise<StageModule>>();

// 個別ステージの例外をアプリ全体へ波及させず、一覧へ戻れる外枠を残す。
class StageErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `Busycube stage ${this.props.stageId} failed`,
      error,
      info.componentStack,
    );
  }

  render() {
    return this.state.failed ? (
      <Alert className="stage-error" severity="error">
        {uiText(this.props.locale, "stageCrashed")}
      </Alert>
    ) : (
      this.props.children
    );
  }
}

function loadStageModule(
  manifest: StageManifest,
  forceReload = false,
): Promise<StageModule> {
  if (forceReload) modulePromises.delete(manifest);
  const existing = modulePromises.get(manifest);
  if (existing) return existing;
  const promise = manifest.load().then((module) => {
    // manifest索引と遅延ロード先の食い違いは、不完全なステージを描画する前に検出する。
    const declared = new Set<string>(manifest.boxIds);
    const implemented = Object.keys(module.boxes);
    if (
      module.id !== manifest.id ||
      implemented.length !== declared.size ||
      implemented.some((boxId) => !declared.has(boxId))
    ) {
      throw new Error(`Invalid module contract for ${manifest.id}`);
    }
    return module;
  });
  modulePromises.set(manifest, promise);
  return promise;
}

function stageProgress(manifest: StageManifest, progress: ProgressController) {
  const solved = new Set(
    progress.document.stages[manifest.id]?.solvedBoxIds ?? [],
  );
  const solvedCount = manifest.boxIds.filter((boxId) =>
    solved.has(boxId),
  ).length;
  return { solved, solvedCount };
}

export function ManifestStageHost({
  manifest,
  displayCode,
  previousStage,
  previousDisplayCode,
  nextStage,
  nextDisplayCode,
  locale,
  progress,
  services,
  onBack,
  onPrevious,
  onNext,
}: Props) {
  const [module, setModule] = useState<StageModule | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [signal, setSignal] = useState<AbortSignal | null>(null);
  const { solved, solvedCount } = stageProgress(manifest, progress);
  // 入場前のクリアと今回のクリアを分け、再訪時にも箱の開封演出を成立させる。
  const [solvedBeforeEntry] = useState(() => new Set(solved));
  const [solvedThisAttempt, setSolvedThisAttempt] = useState<
    ReadonlySet<string>
  >(() => new Set());
  // 永続化関数の更新で各ステージへ渡すコールバックの同一性を崩さない。
  const persistSolveRef = useRef(progress.solve);
  const persistMarkRef = useRef(progress.mark);
  persistSolveRef.current = progress.solve;
  persistMarkRef.current = progress.mark;
  const copy = messages[locale];
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    // 一覧の深いscroll位置をstageへ持ち込まず、画面遷移を見出しから読み始められるようにする。
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // 遅延ロード完了前に別ステージへ移動しても、古い結果でstateを更新しない。
    let active = true;
    setModule(null);
    setLoadError(false);
    void loadStageModule(manifest, attempt > 0)
      .then((loaded) => {
        if (active) setModule(loaded);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, manifest]);

  useEffect(() => {
    // ステージ配下のlistener・timer・streamを離脱時に一括して停止する契約。
    const controller = new AbortController();
    setSignal(controller.signal);
    return () => controller.abort();
  }, []);

  const solve = useCallback(
    (boxId: string) => {
      setSolvedThisAttempt((current) =>
        current.has(boxId) ? current : new Set([...current, boxId]),
      );
      persistSolveRef.current(manifest.id, boxId);
    },
    [manifest.id],
  );
  const solvers = useMemo(
    () =>
      Object.fromEntries(
        manifest.boxIds.map((boxId) => [boxId, () => solve(boxId)]),
      ),
    [manifest.boxIds, solve],
  );
  const boxes = useMemo(() => {
    if (!module) return {};
    return Object.fromEntries(
      manifest.boxIds.map((boxId) => {
        const definition = module.boxes[boxId];
        const solve = solvers[boxId];
        if (!definition || !solve) {
          throw new Error(`Missing runtime box ${manifest.id}/${boxId}`);
        }
        return [
          boxId,
          {
            id: boxId,
            definition,
            state: deriveProblemBoxVisualState(
              solvedBeforeEntry.has(boxId),
              solvedThisAttempt.has(boxId),
            ),
            solve,
          },
        ];
      }),
    );
  }, [
    manifest.boxIds,
    manifest.id,
    module,
    solvedBeforeEntry,
    solvedThisAttempt,
    solvers,
  ]);
  const stageProgressApi = useMemo(
    () => ({
      hasMarker: (marker: string) =>
        progress.document.stages[manifest.id]?.markers?.includes(marker) ??
        false,
      mark: (marker: string) => persistMarkRef.current(manifest.id, marker),
    }),
    [manifest.id, progress.document.stages],
  );
  const capability = module ? safeCapabilityProbe(module.probe) : "unknown";
  const isUnavailable =
    capability === "unsupported" || capability === "unavailable";
  const persistentlyComplete = solvedCount === manifest.boxIds.length;

  return (
    <section className="stage-view" aria-labelledby={activeStageHeadingId}>
      <Button
        className="back-button"
        startIcon={<ArrowBackOutlined />}
        onClick={onBack}
      >
        {copy.back}
      </Button>
      <header className="stage-view__header">
        <p>{displayCode}</p>
        <h2 id={activeStageHeadingId} ref={headingRef} tabIndex={-1}>
          {manifest.name[locale]}
        </h2>
        <Chip
          className="stage-state"
          color={persistentlyComplete ? "success" : "default"}
          variant="outlined"
          label={`${solvedCount}/${manifest.boxIds.length}`}
        />
      </header>

      {loadError ? (
        <Alert
          className="stage-error"
          severity="error"
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {uiText(locale, "stageRetry")}
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
              >
                {messages[locale].reload}
              </Button>
            </>
          }
        >
          {uiText(locale, "stageCrashed")}
        </Alert>
      ) : !module || !signal ? (
        <div className="stage-loading" role="status">
          <CircularProgress size={22} />
          <span>{uiText(locale, "stageLoading")}</span>
        </div>
      ) : (
        <div className="stage-view__play-area">
          {/* 未対応環境でも謎の内容は見せ、実行不能な操作だけをinertで防ぐ。 */}
          <div
            className="stage-view__puzzle"
            inert={isUnavailable ? true : undefined}
          >
            <StageErrorBoundary stageId={manifest.id} locale={locale}>
              <module.Component
                locale={locale}
                signal={signal}
                boxes={boxes}
                progress={stageProgressApi}
                services={services}
              />
            </StageErrorBoundary>
          </div>
          {isUnavailable && (
            <div className="capability-overlay" role="status">
              <Alert className="capability-message" severity="warning">
                {copy.unavailable}
              </Alert>
            </div>
          )}
        </div>
      )}

      {((previousStage && onPrevious) || (nextStage && onNext)) && (
        <nav
          className="stage-view__navigation"
          aria-label={`${copy.previousStage} / ${copy.nextStage}`}
        >
          {previousStage && onPrevious && (
            <Card
              className="stage-view__navigation-button stage-view__navigation-button--previous"
              variant="outlined"
            >
              <CardActionArea onClick={onPrevious}>
                <span className="stage-view__navigation-label">
                  {copy.previousStage}
                </span>
                <strong className="stage-view__navigation-name">
                  <span>{previousDisplayCode}</span>
                  {previousStage.name[locale]}
                </strong>
                <ArrowBackOutlined
                  className="stage-view__navigation-arrow"
                  aria-hidden="true"
                />
              </CardActionArea>
            </Card>
          )}
          {nextStage && onNext && (
            <Card
              className="stage-view__navigation-button stage-view__navigation-button--next"
              variant="outlined"
            >
              <CardActionArea onClick={onNext}>
                <span className="stage-view__navigation-label">
                  {copy.nextStage}
                </span>
                <strong className="stage-view__navigation-name">
                  <span>{nextDisplayCode}</span>
                  {nextStage.name[locale]}
                </strong>
                <ArrowForwardOutlined
                  className="stage-view__navigation-arrow"
                  aria-hidden="true"
                />
              </CardActionArea>
            </Card>
          )}
        </nav>
      )}
    </section>
  );
}
