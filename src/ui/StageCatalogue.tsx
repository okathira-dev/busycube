import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import PlayCircleOutlineOutlined from "@mui/icons-material/PlayCircleOutlineOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ProgressDocument } from "../domain/progress";
import { deriveStageProgress } from "../domain/stageRuntime";
import { messages } from "../i18n";
import type { StageAccessKind, StageIdFormat } from "../runtime/stageContract";
import { preloadOnActivation } from "./activationIntent";
import { GiftBox, type GiftBoxState } from "./GiftBox";
import { uiText } from "./locale";
import { type CatalogueStage, stageAccessOrder } from "./stageCatalogueModel";
import "./StageCatalogue.css";

type ProgressFilter = "all" | "unstarted" | "partial" | "solved";
type AccessFilter = "all" | StageAccessKind;

const groupIcon = {
  "baseline-direct": PlayCircleOutlineOutlined,
  "baseline-permission": AdminPanelSettingsOutlined,
  limited: ScienceOutlined,
} as const;

const groupLabel = {
  "baseline-direct": "stageAccessDirect",
  "baseline-permission": "stageAccessPermission",
  limited: "stageAccessLimited",
} as const;

interface Props {
  headingId: string;
  heading: string;
  progressLabel: string;
  solvedCount: number;
  totalBoxCount: number;
  locale: "ja" | "en";
  stages: readonly CatalogueStage[];
  progressStages: ProgressDocument["stages"];
  nextIncompleteStage?: CatalogueStage;
  restore: { stageId: string; scrollY?: number } | null;
  onOpen(stageId: StageIdFormat): void;
  onPreload(stageId: StageIdFormat): void;
}

/** 独立したstage群を、access groupと進捗から探せるcatalogueとして提示する。 */
export const StageCatalogue = memo(function StageCatalogue({
  headingId,
  heading,
  progressLabel,
  solvedCount,
  totalBoxCount,
  locale,
  stages,
  progressStages,
  nextIncompleteStage,
  restore,
  onOpen,
  onPreload,
}: Props) {
  const copy = messages[locale];
  const [markerToken, setMarkerToken] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");

  useEffect(() => {
    const token = new URL(window.location.href).searchParams.get(
      "catalogue-round",
    );
    if (!token) return;
    const channel = new BroadcastChannel(`busycube:catalogue-marker:${token}`);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.data === `arm:${token}`) setMarkerToken(token);
    };
    channel.addEventListener("message", receive);
    channel.postMessage(`hello:${token}`);
    return () => channel.close();
  }, []);

  useLayoutEffect(() => {
    if (!restore) return;
    if (restore.scrollY !== undefined)
      window.scrollTo({ top: restore.scrollY });
    const frame = window.requestAnimationFrame(() => {
      const action = document.querySelector<HTMLElement>(
        `[data-stage-id="${restore.stageId}"] .stage-card__action`,
      );
      if (!action) {
        document.getElementById(headingId)?.focus({ preventScroll: true });
        return;
      }
      const rect = action.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        action.scrollIntoView({ block: "center" });
      }
      action.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [headingId, restore]);

  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredStages = useMemo(
    () =>
      stages.filter((stage) => {
        const solvedBoxIds = new Set(
          progressStages[stage.manifest.id]?.solvedBoxIds ?? [],
        );
        const state = deriveStageProgress(stage.manifest.boxIds, solvedBoxIds);
        const matchesQuery =
          normalizedQuery.length === 0 ||
          stage.displayCode.toLowerCase().includes(normalizedQuery) ||
          stage.manifest.id.toLowerCase().includes(normalizedQuery) ||
          stage.manifest.name[locale]
            .toLocaleLowerCase(locale)
            .includes(normalizedQuery);
        return (
          matchesQuery &&
          (progressFilter === "all" ||
            (progressFilter === "unstarted"
              ? state === "untouched"
              : progressFilter === state)) &&
          (accessFilter === "all" || accessFilter === stage.accessKind)
        );
      }),
    [
      accessFilter,
      locale,
      normalizedQuery,
      progressFilter,
      progressStages,
      stages,
    ],
  );
  const progressValue =
    totalBoxCount === 0 ? 0 : (solvedCount / totalBoxCount) * 100;
  const hasFilters =
    query.length > 0 || progressFilter !== "all" || accessFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setProgressFilter("all");
    setAccessFilter("all");
  };

  return (
    <section aria-labelledby={headingId}>
      <div className="section-heading">
        <div>
          <h2 id={headingId} tabIndex={-1}>
            {heading}
          </h2>
          <p>
            {progressLabel}: {solvedCount} / {totalBoxCount}
          </p>
        </div>
        {nextIncompleteStage ? (
          <Button
            className="section-heading__action"
            variant="contained"
            startIcon={<PlayArrowOutlined />}
            {...preloadOnActivation(() =>
              onPreload(nextIncompleteStage.manifest.id),
            )}
            onClick={() => onOpen(nextIncompleteStage.manifest.id)}
          >
            {copy.continueStage}
            <span className="stage-catalogue__continue-code">
              {nextIncompleteStage.displayCode}
            </span>
          </Button>
        ) : (
          <Chip color="success" label={copy.allStagesSolved} />
        )}
      </div>

      <LinearProgress
        className="stage-catalogue__progress"
        variant="determinate"
        value={progressValue}
        aria-label={progressLabel}
      />

      <Paper className="stage-catalogue__filters" variant="outlined">
        <TextField
          label={copy.searchStages}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined aria-hidden="true" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label={copy.progressFilter}
          value={progressFilter}
          onChange={(event) =>
            setProgressFilter(event.target.value as ProgressFilter)
          }
          size="small"
        >
          <MenuItem value="all">{copy.filterAll}</MenuItem>
          <MenuItem value="unstarted">{copy.filterUnstarted}</MenuItem>
          <MenuItem value="partial">{copy.filterPartial}</MenuItem>
          <MenuItem value="solved">{copy.filterSolved}</MenuItem>
        </TextField>
        <TextField
          select
          label={copy.accessFilter}
          value={accessFilter}
          onChange={(event) =>
            setAccessFilter(event.target.value as AccessFilter)
          }
          size="small"
        >
          <MenuItem value="all">{copy.filterAll}</MenuItem>
          {stageAccessOrder.map((group) => (
            <MenuItem key={group} value={group}>
              {uiText(locale, groupLabel[group])}
            </MenuItem>
          ))}
        </TextField>
        {hasFilters && (
          <Button onClick={clearFilters}>{copy.clearFilters}</Button>
        )}
      </Paper>

      <Typography
        className="stage-catalogue__result-count"
        color="text.secondary"
        aria-live="polite"
      >
        {copy.stageResults}: {filteredStages.length}
      </Typography>

      <div className="stage-catalogue">
        {stageAccessOrder.map((group) => {
          const Icon = groupIcon[group];
          const groupStages = filteredStages.filter(
            (stage) => stage.accessKind === group,
          );
          if (groupStages.length === 0) return null;
          return (
            <Accordion
              className="stage-catalogue__group"
              key={group}
              defaultExpanded
              disableGutters
              sx={{
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "rgba(24, 19, 41, 0.6)",
                "&::before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined />}
                sx={{ minHeight: 56, bgcolor: "rgba(33, 26, 53, 0.66)" }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", gap: 1, minWidth: 0 }}
                >
                  <Icon fontSize="small" aria-hidden="true" />
                  <Typography component="h3" sx={{ fontWeight: 700 }}>
                    {uiText(locale, groupLabel[group])}
                  </Typography>
                  <Chip size="small" label={groupStages.length} />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
                <ul className="stage-grid">
                  {groupStages.map((stage) => (
                    <li key={stage.manifest.id}>
                      <StageCard
                        stage={stage}
                        locale={locale}
                        stages={progressStages}
                        onOpen={onOpen}
                        onPreload={onPreload}
                      />
                    </li>
                  ))}
                </ul>
              </AccordionDetails>
            </Accordion>
          );
        })}
        {filteredStages.length === 0 && (
          <Paper className="stage-catalogue__empty" variant="outlined">
            <Typography>{copy.noStageResults}</Typography>
            <Button onClick={clearFilters}>{copy.clearFilters}</Button>
          </Paper>
        )}
        <div
          className={`stage-catalogue__marker ${markerToken ? "stage-catalogue__marker--active" : ""}`}
          data-busycube-catalogue-marker={markerToken ?? "inactive"}
          aria-hidden="true"
        />
      </div>
    </section>
  );
});

interface StageCardProps {
  stage: CatalogueStage;
  locale: "ja" | "en";
  stages: ProgressDocument["stages"];
  onOpen(stageId: StageIdFormat): void;
  onPreload(stageId: StageIdFormat): void;
}

function StageCard({
  stage,
  locale,
  stages,
  onOpen,
  onPreload,
}: StageCardProps) {
  const copy = messages[locale];
  const manifest = stage.manifest;
  const boxIds = manifest.boxIds;
  const solvedBoxIds = new Set(stages[manifest.id]?.solvedBoxIds ?? []);
  const state = deriveStageProgress(boxIds, solvedBoxIds);
  const status =
    state === "solved"
      ? copy.solved
      : state === "partial"
        ? copy.partial
        : copy.available;
  const giftState: GiftBoxState =
    state === "solved" ? "open" : state === "partial" ? "closed" : "ribboned";
  const solvedBoxes = boxIds.filter((boxId) => solvedBoxIds.has(boxId)).length;

  return (
    <Card
      component="article"
      className={`stage-card stage-card--${stage.accessKind}`}
      data-progress={state}
      data-stage-id={manifest.id}
      variant="outlined"
    >
      <CardActionArea
        className="stage-card__action"
        {...preloadOnActivation(() => onPreload(manifest.id))}
        onClick={() => onOpen(manifest.id)}
      >
        <GiftBox
          state={giftState}
          color="var(--stage-access-color, #60a5fa)"
          label={`${manifest.name[locale]}: ${status}`}
          size="compact"
          decorative
        />
        <CardContent className="stage-card__text">
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography className="stage-card__id" component="p">
              {stage.displayCode}
            </Typography>
            <Chip
              className="stage-card__progress"
              size="small"
              label={`${solvedBoxes}/${boxIds.length}`}
            />
          </Stack>
          <Typography className="stage-card__heading" component="h4">
            {manifest.name[locale]}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
