import { createTheme } from "@mui/material/styles";

/**
 * MUIが担当する共通UIの見た目を一か所に集約する。
 * パズル固有の色や演出は各CSSに残し、テーマ変更がゲーム内容へ波及しないようにする。
 */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#c7a7ff", contrastText: "#171020" },
    secondary: { main: "#ffd166", contrastText: "#171020" },
    error: { main: "#ff8fa8" },
    warning: { main: "#e8b768" },
    success: { main: "#56d9a2" },
    background: { default: "#100d1d", paper: "#1c172d" },
    text: { primary: "#f7f3ff", secondary: "#bfb7cf" },
    divider: "#4d4265",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44 } },
    },
    MuiCardActionArea: {
      styleOverrides: { root: { borderRadius: "inherit" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});
