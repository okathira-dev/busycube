import { ThemeProvider } from "@mui/material/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { theme } from "./theme/theme";
import { AppErrorBoundary } from "./ui/AppErrorBoundary";
import "./styles/base.css";
import "./styles/app-shell.css";
import "./stages/shared/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Busycube root element was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
