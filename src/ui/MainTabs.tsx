import { styled } from "@mui/material/styles";
import Tab, { tabClasses } from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { MainView } from "./appRoute";

export type { MainView } from "./appRoute";

const StyledTabs = styled(Tabs)(({ theme }) => ({
  width: "100%",
  maxWidth: "44rem",
  margin: `${theme.spacing(2)} auto ${theme.spacing(5)}`,
  padding: theme.spacing(0.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 999,
  background: "rgba(24, 19, 41, 0.8)",
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 44,
  borderRadius: 999,
  padding: theme.spacing(1, 2),
  color: theme.palette.text.secondary,
  [`&.${tabClasses.selected}`]: {
    color: theme.palette.primary.contrastText,
    background: "#f2e8ff",
  },
}));

interface Props {
  value: MainView;
  labels: Record<MainView, string>;
  ariaLabel: string;
  onChange(value: MainView): void;
}

/** メイン3画面を、選択状態とキーボード操作を備えたタブとして提供する。 */
export function MainTabs({ value, labels, ariaLabel, onChange }: Props) {
  return (
    <nav aria-label={ariaLabel}>
      <StyledTabs
        value={value}
        onChange={(_event, nextValue: MainView) => onChange(nextValue)}
        variant="fullWidth"
        textColor="inherit"
        slotProps={{ indicator: { hidden: true } }}
      >
        {(Object.keys(labels) as MainView[]).map((view) => (
          <StyledTab key={view} value={view} label={labels[view]} />
        ))}
      </StyledTabs>
    </nav>
  );
}
