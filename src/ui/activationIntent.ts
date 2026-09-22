import type { KeyboardEvent, PointerEvent } from "react";

interface ActivationPreloadOptions {
  shouldHandlePointer?(event: PointerEvent<HTMLElement>): boolean;
}

/** primary pointerの押下を、click確定前の実行意図として扱う。 */
function beginPointerActivation(
  event: PointerEvent<HTMLElement>,
  action: () => void,
) {
  if (event.button === 0) action();
}

/** native buttonと同じEnter／Spaceだけをkeyboardの実行意図として扱う。 */
function beginKeyboardActivation(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
) {
  if (!event.repeat && (event.key === "Enter" || event.key === " ")) action();
}

/** pointerdown／Enter／Spaceで同じ先読み処理を始めるpropsを返す。 */
export function preloadOnActivation(
  preload: () => void,
  options: ActivationPreloadOptions = {},
) {
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (options.shouldHandlePointer?.(event) === false) return;
      beginPointerActivation(event, preload);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      beginKeyboardActivation(event, preload);
    },
  };
}
