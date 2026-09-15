import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import type { MouseEvent } from "react";
import type { MainView } from "./appRoute";

export type { MainView } from "./appRoute";

const StyledNav = styled("nav")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  width: "100%",
  maxWidth: "44rem",
  margin: `${theme.spacing(2)} auto ${theme.spacing(5)}`,
  padding: theme.spacing(0.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 999,
  background: "rgba(24, 19, 41, 0.8)",
}));

const StyledLink = styled(Button)(({ theme }) => ({
  minWidth: 0,
  minHeight: 44,
  borderRadius: 999,
  padding: theme.spacing(1, 2),
  color: theme.palette.text.secondary,
  "&[aria-current='page']": {
    color: theme.palette.primary.contrastText,
    background: "#f2e8ff",
  },
}));

interface Props {
  value: MainView;
  labels: Record<MainView, string>;
  hrefs: Record<MainView, string>;
  ariaLabel: string;
  onChange(value: MainView): void;
}

function shouldHandleInApp(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/** URLを保った通常linkとして、主要3画面の現在地とSPA遷移を両立する。 */
export function MainTabs({ value, labels, hrefs, ariaLabel, onChange }: Props) {
  return (
    <StyledNav aria-label={ariaLabel}>
      {(Object.keys(labels) as MainView[]).map((view) => (
        <StyledLink
          href={hrefs[view]}
          key={view}
          aria-current={view === value ? "page" : undefined}
          onClick={(event) => {
            if (!shouldHandleInApp(event)) return;
            event.preventDefault();
            onChange(view);
          }}
        >
          {labels[view]}
        </StyledLink>
      ))}
    </StyledNav>
  );
}
