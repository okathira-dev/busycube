import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { detectLocale, messages } from "../i18n";
import "./AppErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Busycube render failure", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const copy = messages[detectLocale()];
    return (
      <main className="fatal">
        <Paper component="section" variant="outlined">
          <div className="fatal__box" aria-hidden="true">
            !
          </div>
          <Alert severity="error">
            <AlertTitle>{copy.fatalTitle}</AlertTitle>
            {copy.fatalBody}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            {copy.reload}
          </Button>
        </Paper>
      </main>
    );
  }
}
