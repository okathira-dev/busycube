import { useEffect, useState } from "react";

/** 短時間で終わる処理を隠し、待機が続いた場合だけindicatorを表示する。 */
export function useDelayedVisibility(active: boolean, delayMs: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return visible;
}
