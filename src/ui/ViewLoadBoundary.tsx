import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { Component, type ReactNode, Suspense } from "react";
import { type Locale, messages } from "../i18n";
import { uiText } from "./locale";

interface Props {
  locale: Locale;
  children: ReactNode;
}

/** 遅延画面の失敗時にも、外側のナビゲーションと明示更新操作を残す。 */
export class ViewLoadBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

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
      <Suspense fallback={<p role="status">{uiText(locale, "viewLoading")}</p>}>
        {children}
      </Suspense>
    );
  }
}
