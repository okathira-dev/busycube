import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Component, type ReactNode, Suspense } from "react";
import { type Locale, messages } from "../i18n";
import { uiText } from "./locale";
import "./ViewLoadBoundary.css";

interface Props {
  locale: Locale;
  resetKey: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
  resetKey: string;
}

/** 遅延画面の失敗時にも、外側のナビゲーションと明示更新操作を残す。 */
export class ViewLoadBoundary extends Component<Props, State> {
  state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: Props, state: State) {
    return props.resetKey === state.resetKey
      ? null
      : { failed: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { locale, children } = this.props;
    if (this.state.failed) {
      return (
        <Alert severity="error">
          {uiText(locale, "viewLoadFailed")}
          <Button onClick={() => window.location.reload()}>
            {messages[locale].reload}
          </Button>
        </Alert>
      );
    }
    return (
      <Suspense
        fallback={
          <div className="view-loading" role="status">
            <CircularProgress aria-hidden="true" size={28} />
            <span className="sr-only">{uiText(locale, "viewLoading")}</span>
          </div>
        }
      >
        {children}
      </Suspense>
    );
  }
}
