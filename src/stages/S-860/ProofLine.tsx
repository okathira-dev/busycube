import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  initialText: string;
  className: string;
  as: "h1" | "p";
  label: string;
  onCorrect(value: string): void;
}
export function ProofLine({
  initialText,
  className,
  as: Tag,
  label,
  onCorrect,
}: Props) {
  const elementRef = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const contextRef = useRef<EditContext | null>(null);
  const refreshBounds = useRef<() => void>(() => {});
  const [value, setValue] = useState(initialText);
  useLayoutEffect(() => {
    const element = elementRef.current;
    const context = contextRef.current;
    const node = element?.firstChild;
    if (
      context &&
      node instanceof Text &&
      node.data === value &&
      document.activeElement === element
    ) {
      document
        .getSelection()
        ?.setBaseAndExtent(
          node,
          Math.min(context.selectionStart, node.length),
          node,
          Math.min(context.selectionEnd, node.length),
        );
    }
    refreshBounds.current();
  }, [value]);
  useEffect(() => {
    const element = elementRef.current;
    const Edit = window.EditContext;
    if (!element || !Edit) return;
    const context = new Edit({ text: initialText });
    contextRef.current = context;
    element.editContext = context;
    let composing = false;
    const mirror = () => {
      setValue(context.text);
      if (!composing) onCorrect(context.text);
    };
    // textupdate到着時にはUAがcontext.textを更新済み。updateTextを重ねると二重挿入になる。
    const update = () => mirror();
    const compositionStart = () => {
      composing = true;
      element.dataset.composing = "true";
    };
    const compositionEnd = () => {
      composing = false;
      delete element.dataset.composing;
      mirror();
    };
    const updateBounds = () => {
      const rect = element.getBoundingClientRect();
      context.updateControlBounds(rect);
      const node = element.firstChild;
      if (!(node instanceof Text) || node.length !== context.text.length) {
        context.updateSelectionBounds(rect);
        return;
      }
      const range = document.createRange();
      range.setStart(node, Math.min(context.selectionStart, node.length));
      range.setEnd(node, Math.min(context.selectionEnd, node.length));
      context.updateSelectionBounds(range.getBoundingClientRect());
      const bounds = Array.from({ length: node.length }, (_, index) => {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return range.getBoundingClientRect();
      });
      context.updateCharacterBounds(0, bounds);
    };
    const syncSelection = () => {
      if (document.activeElement !== element) return;
      // Native text changes precede React's DOM update. The old DOM selection
      // must not overwrite the selection accompanying that edit.
      if (composing || element.textContent !== context.text) return;
      const selection = document.getSelection();
      if (
        !selection?.anchorNode ||
        !selection.focusNode ||
        !element.contains(selection.anchorNode) ||
        !element.contains(selection.focusNode)
      )
        return;
      const offset = (node: Node, offset: number) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.setEnd(node, offset);
        return Math.min(range.toString().length, context.text.length);
      };
      context.updateSelection(
        offset(selection.anchorNode, selection.anchorOffset),
        offset(selection.focusNode, selection.focusOffset),
      );
      updateBounds();
    };
    const setSelection = (start: number, end: number) => {
      context.updateSelection(start, end);
      const node = element.firstChild;
      if (node instanceof Text)
        document.getSelection()?.setBaseAndExtent(node, start, node, end);
      updateBounds();
    };
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelection(0, context.text.length);
        return;
      }
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      const start = context.selectionStart;
      const end = context.selectionEnd;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? context.text.length
            : event.key === "ArrowLeft"
              ? start !== end && !event.shiftKey
                ? Math.min(start, end)
                : Math.max(0, end - 1)
              : start !== end && !event.shiftKey
                ? Math.max(start, end)
                : Math.min(context.text.length, end + 1);
      setSelection(event.shiftKey ? start : next, next);
    };
    const paste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      const start = Math.min(context.selectionStart, context.selectionEnd);
      const end = Math.max(context.selectionStart, context.selectionEnd);
      context.updateText(start, end, text);
      context.updateSelection(start + text.length, start + text.length);
      mirror();
    };
    refreshBounds.current = updateBounds;
    context.addEventListener("textupdate", update);
    context.addEventListener("compositionstart", compositionStart);
    context.addEventListener("compositionend", compositionEnd);
    context.addEventListener("characterboundsupdate", updateBounds);
    document.addEventListener("selectionchange", syncSelection);
    element.addEventListener("paste", paste);
    element.addEventListener("keydown", keydown);
    window.addEventListener("scroll", updateBounds, true);
    const resize = new ResizeObserver(updateBounds);
    resize.observe(element);
    const frame = requestAnimationFrame(updateBounds);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      context.removeEventListener("textupdate", update);
      context.removeEventListener("compositionstart", compositionStart);
      context.removeEventListener("compositionend", compositionEnd);
      context.removeEventListener("characterboundsupdate", updateBounds);
      document.removeEventListener("selectionchange", syncSelection);
      element.removeEventListener("paste", paste);
      element.removeEventListener("keydown", keydown);
      window.removeEventListener("scroll", updateBounds, true);
      refreshBounds.current = () => {};
      contextRef.current = null;
      if (element.editContext === context) element.editContext = undefined;
    };
  }, [initialText, onCorrect]);
  return (
    <Tag
      ref={elementRef}
      className={`${className} s860-editable`}
      tabIndex={0}
      role="textbox"
      aria-label={label}
      aria-multiline="false"
    >
      {value}
    </Tag>
  );
}
